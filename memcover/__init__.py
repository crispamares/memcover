import os
import sys

ROOT = os.path.dirname(os.path.realpath(__file__))

#===============================================================================
#     import indyva
#===============================================================================
try:
    import indyva
except ImportError:
    sys.path.append(os.path.join(ROOT, '..' ,'lib', 'indyva'))
    import indyva

