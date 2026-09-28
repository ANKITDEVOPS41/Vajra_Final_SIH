"""
ConvectNow — Persistent Storm Cell Tracking Engine (Milestone 2 & Milestone 3)
Implements:
1. Hungarian Algorithm (scipy.optimize.linear_sum_assignment) bipartite cell matching
2. Centroid distance + Bounding Box IoU + Area/Intensity similarity cost metric
3. Persistent cell identity (e.g. CELL-A17) preserved across scans T0, T+10, T+20...
4. Calculation of true geographic displacement, ground speed (km/h), and heading bearing
5. Multi-scan trajectory history accumulation
"""

import numpy as np
from scipy.optimize import linear_sum_assignment


class PersistentCellTracker:
    """
    Maintains active tracks of storm cells across sequential radar scans.
    """

    def __init__(
        self,
        max_distance_px: float = 30.0,    # Max plausible movement per scan (~30 km/10 min = 180 km/h)
        iou_weight: float = 0.40,
        dist_weight: float = 0.40,
        area_weight: float = 0.20,
        max_lost_scans: int = 2,
    ):
        self.max_distance_px = max_distance_px
        self.iou_weight = iou_weight
        self.dist_weight = dist_weight
        self.area_weight = area_weight
        self.max_lost_scans = max_lost_scans

        self.next_cell_num = 1
        self.active_tracks: dict[str, dict] = {}  # cell_id -> track state

    def _compute_iou(self, bbox_a: list[int], bbox_b: list[int]) -> float:
        """Computes Intersection-over-Union between two bounding boxes [min_x, min_y, max_x, max_y]."""
        x_left = max(bbox_a[0], bbox_b[0])
        y_top = max(bbox_a[1], bbox_b[1])
        x_right = min(bbox_a[2], bbox_b[2])
        y_bottom = min(bbox_a[3], bbox_b[3])

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection = (x_right - x_left) * (y_bottom - y_top)
        area_a = (bbox_a[2] - bbox_a[0]) * (bbox_a[3] - bbox_a[1])
        area_b = (bbox_b[2] - bbox_b[0]) * (bbox_b[3] - bbox_b[1])
        union = float(area_a + area_b - intersection)

        return float(intersection / union) if union > 0 else 0.0

    def update(
        self,
        current_detections: list[dict],
        dt_minutes: float = 5.0,
        grid_res_km: float = 1.0,
    ) -> list[dict]:
        """
        Matches incoming detections from the current radar scan to active cell tracks.
        Returns list of matched cells with persistent cell_ids and calculated kinematics.
        """
        if not self.active_tracks:
            # First radar scan: initialize tracks with IDs CELL-A01, CELL-A02...
            tracked_cells = []
            for det in current_detections:
                cell_id = f"CELL-A{self.next_cell_num:02d}"
                self.next_cell_num += 1

                track_entry = {
                    **det,
                    "cell_id": cell_id,
                    "age_scans": 1,
                    "lost_scans": 0,
                    "velocity_kmh": 0.0,
                    "heading_deg": 0.0,
                    "trajectory_history": [
                        {"x": det["centroid_x"], "y": det["centroid_y"], "dbz": det["peak_dbz"]}
                    ],
                }
                self.active_tracks[cell_id] = track_entry
                tracked_cells.append(track_entry)
            return tracked_cells

        # Existing active track IDs
        active_ids = list(self.active_tracks.keys())
        num_tracks = len(active_ids)
        num_dets = len(current_detections)

        if num_dets == 0:
            # No cells detected in current scan
            for cid in list(self.active_tracks.keys()):
                self.active_tracks[cid]["lost_scans"] += 1
                if self.active_tracks[cid]["lost_scans"] > self.max_lost_scans:
                    del self.active_tracks[cid]
            return []

        # Cost matrix: (num_tracks, num_dets)
        cost_matrix = np.full((num_tracks, num_dets), fill_value=1e5, dtype=np.float32)

        for i, tid in enumerate(active_ids):
            track = self.active_tracks[tid]
            tx, ty = track["centroid_x"], track["centroid_y"]
            t_area = track["area_km2"]
            t_bbox = track["bbox"]

            for j, det in enumerate(current_detections):
                dx = det["centroid_x"] - tx
                dy = det["centroid_y"] - ty
                dist_px = np.sqrt(dx ** 2 + dy ** 2)

                if dist_px > self.max_distance_px:
                    continue  # Too far to be the same storm cell

                # IoU term
                iou = self._compute_iou(t_bbox, det["bbox"])

                # Area similarity term
                area_diff = abs(t_area - det["area_km2"]) / (t_area + det["area_km2"] + 1e-5)

                # Composite cost: lower is better match
                norm_dist = dist_px / self.max_distance_px
                cost = (self.dist_weight * norm_dist) + (self.iou_weight * (1.0 - iou)) + (self.area_weight * area_diff)
                cost_matrix[i, j] = cost

        # Solve assignment using Hungarian algorithm
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        matched_tracks = set()
        matched_dets = set()
        tracked_cells = []

        for r, c in zip(row_ind, col_ind):
            if cost_matrix[r, c] < 0.85:  # Valid assignment threshold
                tid = active_ids[r]
                det = current_detections[c]

                prev_track = self.active_tracks[tid]
                dx_px = det["centroid_x"] - prev_track["centroid_x"]
                dy_px = det["centroid_y"] - prev_track["centroid_y"]

                # Ground displacement in km
                disp_km = np.sqrt(dx_px ** 2 + dy_px ** 2) * grid_res_km
                speed_kmh = float((disp_km / dt_minutes) * 60.0)

                # Heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
                heading_deg = float(np.degrees(np.arctan2(dx_px, -dy_px)) % 360)

                # Update trajectory history
                traj = list(prev_track.get("trajectory_history", []))
                traj.append({"x": det["centroid_x"], "y": det["centroid_y"], "dbz": det["peak_dbz"]})
                if len(traj) > 12:
                    traj.pop(0)

                updated_track = {
                    **det,
                    "cell_id": tid,
                    "age_scans": prev_track["age_scans"] + 1,
                    "lost_scans": 0,
                    "velocity_kmh": round(speed_kmh, 1),
                    "heading_deg": round(heading_deg, 1),
                    "trajectory_history": traj,
                }
                self.active_tracks[tid] = updated_track
                tracked_cells.append(updated_track)

                matched_tracks.add(r)
                matched_dets.add(c)

        # Unmatched detections -> spawn new cells
        for j, det in enumerate(current_detections):
            if j not in matched_dets:
                cell_id = f"CELL-A{self.next_cell_num:02d}"
                self.next_cell_num += 1

                new_track = {
                    **det,
                    "cell_id": cell_id,
                    "age_scans": 1,
                    "lost_scans": 0,
                    "velocity_kmh": 0.0,
                    "heading_deg": 0.0,
                    "trajectory_history": [
                        {"x": det["centroid_x"], "y": det["centroid_y"], "dbz": det["peak_dbz"]}
                    ],
                }
                self.active_tracks[cell_id] = new_track
                tracked_cells.append(new_track)

        # Unmatched tracks -> age out
        for i, tid in enumerate(active_ids):
            if i not in matched_tracks:
                self.active_tracks[tid]["lost_scans"] += 1
                if self.active_tracks[tid]["lost_scans"] > self.max_lost_scans:
                    del self.active_tracks[tid]

        # Sort descending by peak reflectivity
        tracked_cells.sort(key=lambda x: x["peak_dbz"], reverse=True)
        return tracked_cells

    def reset(self):
        self.active_tracks.clear()
        self.next_cell_num = 1
