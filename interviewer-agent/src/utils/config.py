import json
import pathlib
import logging

logger = logging.getLogger("shared_config")

DEFAULT_CONFIG = {
    "TIME_LIMIT_HARD_CUTOFF_SECONDS": 30 * 60,
    "TIME_LIMIT_SOFT_WARNING_SECONDS": 25 * 60,
    "TIME_LIMIT_MINIMUM_SECONDS": 15 * 60,
}

_config_cache = None

def get_shared_config():
    global _config_cache
    if _config_cache is not None:
        return _config_cache

    try:
        base_path = pathlib.Path(__file__).parent.parent.parent.parent
        config_path = base_path / "shared_config.json"
        
        if config_path.exists():
            with open(config_path, "r") as f:
                _config_cache = {**DEFAULT_CONFIG, **json.load(f)}
        else:
            logger.warning(f"Shared config not found at {config_path}, using defaults.")
            _config_cache = DEFAULT_CONFIG

    except Exception as e:
        logger.error(f"Failed to load shared config: {e}")
        _config_cache = DEFAULT_CONFIG
        
    return _config_cache

config = get_shared_config()
TIME_LIMIT_HARD_CUTOFF_SECONDS = config["TIME_LIMIT_HARD_CUTOFF_SECONDS"]
TIME_LIMIT_SOFT_WARNING_SECONDS = config["TIME_LIMIT_SOFT_WARNING_SECONDS"]
TIME_LIMIT_MINIMUM_SECONDS = config["TIME_LIMIT_MINIMUM_SECONDS"]
