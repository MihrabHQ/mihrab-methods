"""mihrab-methods in Python: the prayer-time methods of five authorities,
ported from the TypeScript library and held to its test vectors."""
from .api import (PRAYERS, REVISIONS, CorrectionList, clock_offset_at, load_corrections, minutes_for, place_clock_at,
                  point_key, printed, times_for)

__all__ = ['PRAYERS', 'REVISIONS', 'CorrectionList', 'clock_offset_at', 'load_corrections', 'minutes_for',
           'place_clock_at', 'point_key', 'printed', 'times_for']
