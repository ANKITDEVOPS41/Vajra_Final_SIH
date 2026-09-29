"""
pytest configuration and path setup for ConvectNow.
Aliases convectnow to backend module to support legacy tests.
"""
import sys
import os
import types

# Ensure project root is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Alias convectnow.backend -> backend
try:
    import backend
    convectnow = types.ModuleType("convectnow")
    convectnow.backend = backend
    sys.modules.setdefault("convectnow", convectnow)
    sys.modules.setdefault("convectnow.backend", backend)

    import backend.models
    import backend.models.convectnet
    import backend.models.losses
    import backend.models.inference
    convectnow.backend.models = backend.models
    sys.modules.setdefault("convectnow.backend.models", backend.models)
    sys.modules.setdefault("convectnow.backend.models.convectnet", backend.models.convectnet)
    sys.modules.setdefault("convectnow.backend.models.losses", backend.models.losses)
    sys.modules.setdefault("convectnow.backend.models.inference", backend.models.inference)
except ImportError:
    pass
