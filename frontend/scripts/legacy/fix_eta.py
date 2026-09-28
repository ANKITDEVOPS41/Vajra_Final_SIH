import re

with open('./src/components/ETACountdown.tsx', 'r') as f:
    content = f.read()

# Make the title and subtitle truncate
old_flex_start = """              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#f0b44d]" />
                    <span className="text-xs font-display font-semibold text-white">{item.target_name}</span>
                  </div>
                  <div className="text-[11px] text-white/60 font-mono mt-0.5">
                    Target Threat: <span className="text-[#ef5a67] font-bold">{item.cell_id}</span> ({item.peak_dbz.toFixed(0)} dBZ core)
                  </div>
                </div>

                <div className="text-right">"""

new_flex_start = """              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[#f0b44d] shrink-0" />
                    <span className="text-xs font-display font-semibold text-white truncate" title={item.target_name}>{item.target_name}</span>
                  </div>
                  <div className="text-[11px] text-white/60 font-mono mt-0.5 truncate">
                    Target Threat: <span className="text-[#ef5a67] font-bold">{item.cell_id}</span> ({item.peak_dbz.toFixed(0)} dBZ)
                  </div>
                </div>

                <div className="text-right shrink-0">"""

content = content.replace(old_flex_start, new_flex_start)

with open('./src/components/ETACountdown.tsx', 'w') as f:
    f.write(content)
