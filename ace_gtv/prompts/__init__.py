"""
GTV 提示词模块
"""

from .framework_prompts import (
    FRAMEWORK_PROMPTS_CONFIG,
    MC_DESCRIPTIONS,
    MC_REQUIREMENTS,
    OC_DESCRIPTIONS,
    OC_REQUIREMENTS,
    get_prompt_variables
)

__all__ = [
    'FRAMEWORK_PROMPTS_CONFIG',
    'MC_DESCRIPTIONS',
    'MC_REQUIREMENTS',
    'OC_DESCRIPTIONS',
    'OC_REQUIREMENTS',
    'get_prompt_variables'
]
