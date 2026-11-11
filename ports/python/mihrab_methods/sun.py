"""The suns the methods take: Meeus's apparent sun (Morocco), NOAA's (Algeria)
and the precise apparent sun (Indonesia). A port of src/methods/morocco.ts,
src/methods/algeria.ts and src/sun/preciseSun.ts; the TypeScript is the
reference, and test_vectors.py holds this to it.

Each takes `d`, days from J2000.0 (UT), and returns (declination in radians,
equation of time in minutes), such that the transit at longitude lon (east)
is 720 - 4*lon - eot minutes UT.
"""
import math

RAD = math.pi / 180.0


def _wrap360(x):
    """((x % 360) + 360) % 360 as JavaScript computes it."""
    return math.fmod(math.fmod(x, 360.0) + 360.0, 360.0)


def meeus_apparent_sun(d):
    T = d / 36525.0
    L0 = _wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    C = ((1.914602 - T * (0.004817 + 0.000014 * T)) * math.sin(M)
         + (0.019993 - 0.000101 * T) * math.sin(2 * M)
         + 0.000289 * math.sin(3 * M))
    om = (125.04 - 1934.136 * T) * RAD
    eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    Lm = (280.4665 + 36000.7698 * T) * RAD
    Lmoon = (218.3165 + 481267.8813 * T) * RAD
    dpsi = (-17.2 * math.sin(om) - 1.32 * math.sin(2 * Lm) - 0.23 * math.sin(2 * Lmoon) + 0.21 * math.sin(2 * om)) / 3600
    deps = (9.2 * math.cos(om) + 0.57 * math.cos(2 * Lm) + 0.1 * math.cos(2 * Lmoon) - 0.09 * math.cos(2 * om)) / 3600
    lam = (L0 + C - 0.00569 + dpsi) * RAD
    eps = (eps0 + deps) * RAD
    ra = _wrap360(math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam)) / RAD)
    dec = math.asin(math.sin(eps) * math.sin(lam))
    E = L0 - 0.0057183 - ra + dpsi * math.cos(eps)
    eot = (_wrap360(E + 180) - 180) * 4
    return dec, eot


def noaa_sun(d):
    T = d / 36525.0
    L0 = _wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
    ecc = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    Mr = M * RAD
    C = ((1.914602 - T * (0.004817 + 0.000014 * T)) * math.sin(Mr)
         + (0.019993 - 0.000101 * T) * math.sin(2 * Mr)
         + 0.000289 * math.sin(3 * Mr))
    om = (125.04 - 1934.136 * T) * RAD
    lam = L0 + C - 0.00569 - 0.00478 * math.sin(om)
    eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    eps = eps0 + 0.00256 * math.cos(om)
    dec = math.asin(math.sin(eps * RAD) * math.sin(lam * RAD))
    y = math.tan((eps0 * RAD) / 2) ** 2
    L0r = L0 * RAD
    eot = (4 / RAD) * (y * math.sin(2 * L0r) - 2 * ecc * math.sin(Mr)
                       + 4 * ecc * y * math.sin(Mr) * math.cos(2 * L0r)
                       - 0.5 * y * y * math.sin(4 * L0r) - 1.25 * ecc * ecc * math.sin(2 * Mr))
    return dec, eot


# ---- the precise apparent sun (VSOP87 truncated, IAU 2006 precession, IAU 2000B nutation, light time)

ASEC2RAD = 4.848136811095359935899141e-6
ASEC360 = 1296000
C_AUDAY = 173.1446326846693
DAYS_PER_MILLENNIUM = 365250

EARTH = [
    [
        [
            [1.75347045673, 0, 0], [0.03341656453, 4.66925680415, 6283.0758499914], [0.00034894275, 4.62610242189, 12566.1516999828],
            [0.00003417572, 2.82886579754, 3.523118349], [0.00003497056, 2.74411783405, 5753.3848848968], [0.00003135899, 3.62767041756, 77713.7714681205],
            [0.00002676218, 4.41808345438, 7860.4193924392], [0.00002342691, 6.13516214446, 3930.2096962196], [0.00001273165, 2.03709657878, 529.6909650946],
            [0.00001324294, 0.74246341673, 11506.7697697936], [0.00000901854, 2.04505446477, 26.2983197998], [0.00001199167, 1.10962946234, 1577.3435424478],
            [0.00000857223, 3.50849152283, 398.1490034082], [0.00000779786, 1.17882681962, 5223.6939198022], [0.0000099025, 5.23268072088, 5884.9268465832],
            [0.00000753141, 2.53339052847, 5507.5532386674], [0.00000505267, 4.58292599973, 18849.2275499742], [0.00000492392, 4.20505711826, 775.522611324],
            [0.00000356672, 2.91954114478, 0.0673103028], [0.00000284125, 1.89869240932, 796.2980068164], [0.00000242879, 0.34481445893, 5486.777843175],
            [0.00000317087, 5.84901948512, 11790.6290886588], [0.00000271112, 0.31486255375, 10977.078804699], [0.00000206217, 4.80646631478, 2544.3144198834],
            [0.00000205478, 1.86953770281, 5573.1428014331], [0.00000202318, 2.45767790232, 6069.7767545534], [0.00000126225, 1.08295459501, 20.7753954924],
            [0.00000155516, 0.83306084617, 213.299095438],
        ],
        [[6283.0758499914, 0, 0], [0.00206058863, 2.67823455808, 6283.0758499914], [0.00004303419, 2.63512233481, 12566.1516999828]],
        [[0.00008721859, 1.07253635559, 6283.0758499914]],
    ],
    [[], [[0.00227777722, 3.4137662053, 6283.0758499914], [0.00003805678, 3.37063423795, 12566.1516999828]]],
    [
        [
            [1.00013988784, 0, 0], [0.01670699632, 3.09846350258, 6283.0758499914], [0.00013956024, 3.05524609456, 12566.1516999828],
            [0.0000308372, 5.19846674381, 77713.7714681205], [0.00001628463, 1.17387558054, 5753.3848848968], [0.00001575572, 2.84685214877, 7860.4193924392],
            [0.00000924799, 5.45292236722, 11506.7697697936], [0.00000542439, 4.56409151453, 3930.2096962196], [0.0000047211, 3.66100022149, 5884.9268465832],
            [0.00000085831, 1.27079125277, 161000.6857376741], [0.00000057056, 2.01374292245, 83996.84731811189], [0.00000055736, 5.2415979917, 71430.69561812909],
            [0.00000174844, 3.01193636733, 18849.2275499742], [0.00000243181, 4.2734953079, 11790.6290886588],
        ],
        [[0.00103018607, 1.10748968172, 6283.0758499914], [0.00001721238, 1.06442300386, 12566.1516999828]],
        [[0.00004359385, 5.78455133808, 6283.0758499914]],
    ],
]


def _vsop(formula, t, clamp):
    tp = 1.0
    out = 0.0
    for series in formula:
        s = 0.0
        for a, p, f in series:
            s += a * math.cos(p + t * f)
        incr = tp * s
        if clamp:
            incr = math.fmod(incr, 2 * math.pi)
        out += incr
        tp *= t
    return out


def _earth_j2000(tt):
    t = tt / DAYS_PER_MILLENNIUM
    lon = _vsop(EARTH[0], t, True)
    lat = _vsop(EARTH[1], t, False)
    r = _vsop(EARTH[2], t, False)
    x = r * math.cos(lat) * math.cos(lon)
    y = r * math.cos(lat) * math.sin(lon)
    z = r * math.sin(lat)
    return (x + 0.00000044036 * y - 0.000000190919 * z,
            -0.000000479966 * x + 0.917482137087 * y - 0.397776982902 * z,
            0.397776982902 * y + 0.917482137087 * z)


def delta_t(ut):
    """ΔT in seconds for UT days from J2000 (Espenak & Meeus), held at its 2017 value onward."""
    y = 2000 + (min(ut, 17 * 365.24217) - 14) / 365.24217
    if 2005 <= y < 2050:
        u = y - 2000
        return 62.92 + 0.32217 * u + 0.005589 * u * u
    if 2050 <= y < 2150:
        u = (y - 1820) / 100
        return -20 + 32 * u * u - 0.5628 * (2150 - y)
    if 1986 <= y < 2005:
        u = y - 2000
        return 63.86 + 0.3345 * u - 0.060374 * u ** 2 + 0.0017275 * u ** 3 + 0.000651814 * u ** 4 + 0.00002373599 * u ** 5
    u = (y - 1820) / 100
    return -20 + 32 * u * u


def _nutation(tt):
    def mod(x):
        return math.fmod(x, ASEC360) * ASEC2RAD
    t = tt / 36525
    elp = mod(1287104.79305 + t * 129596581.0481)
    f = mod(335779.526232 + t * 1739527262.8478)
    d = mod(1072260.70369 + t * 1602961601.209)
    om = mod(450160.398036 - t * 6962890.5431)
    dp = (-172064161.0 - 174666.0 * t) * math.sin(om) + 33386.0 * math.cos(om)
    de = (92052331.0 + 9086.0 * t) * math.cos(om) + 15377.0 * math.sin(om)
    a = 2 * (f - d + om)
    dp += (-13170906.0 - 1675.0 * t) * math.sin(a) - 13696.0 * math.cos(a)
    de += (5730336.0 - 3015.0 * t) * math.cos(a) - 4587.0 * math.sin(a)
    a = 2 * (f + om)
    dp += (-2276413.0 - 234.0 * t) * math.sin(a) + 2796.0 * math.cos(a)
    de += (978459.0 - 485.0 * t) * math.cos(a) + 1374.0 * math.sin(a)
    a = 2 * om
    dp += (2074554.0 + 207.0 * t) * math.sin(a) - 698.0 * math.cos(a)
    de += (-897492.0 + 470.0 * t) * math.cos(a) - 291.0 * math.sin(a)
    dp += (1475877.0 - 3633.0 * t) * math.sin(elp) + 11817.0 * math.cos(elp)
    de += (73871.0 - 184.0 * t) * math.cos(elp) - 1924.0 * math.sin(elp)
    return -0.000135 + dp * 1e-7, 0.000388 + de * 1e-7


def _mean_obliquity(tt):
    t = tt / 36525
    return ((((-0.0000000434 * t - 0.000000576) * t + 0.0020034) * t - 0.0001831) * t - 46.836769) * t + 84381.406


def _precess(v, tt):
    t = tt / 36525
    eps0 = 84381.406 * ASEC2RAD
    psia = (((((-0.0000000951 * t + 0.000132851) * t - 0.00114045) * t - 1.0790069) * t + 5038.481507) * t) * ASEC2RAD
    omegaa = (((((0.0000003337 * t - 0.000000467) * t - 0.00772503) * t + 0.0512623) * t - 0.025754) * t + 84381.406) * ASEC2RAD
    chia = (((((-0.000000056 * t + 0.000170663) * t - 0.00121197) * t - 2.3814292) * t + 10.556403) * t) * ASEC2RAD
    sa, ca = math.sin(eps0), math.cos(eps0)
    sb, cb = math.sin(-psia), math.cos(-psia)
    sc, cc = math.sin(-omegaa), math.cos(-omegaa)
    sd, cd = math.sin(chia), math.cos(chia)
    xx = cd * cb - sb * sd * cc
    yx = cd * sb * ca + sd * cc * cb * ca - sa * sd * sc
    zx = cd * sb * sa + sd * cc * cb * sa + ca * sd * sc
    xy = -sd * cb - sb * cd * cc
    yy = -sd * sb * ca + cd * cc * cb * ca - sa * cd * sc
    zy = -sd * sb * sa + cd * cc * cb * sa + ca * cd * sc
    xz = sb * sc
    yz = -sc * cb * ca - sa * cc
    zz = -sc * cb * sa + cc * ca
    return (xx * v[0] + yx * v[1] + zx * v[2], xy * v[0] + yy * v[1] + zy * v[2], xz * v[0] + yz * v[1] + zz * v[2])


def _nutate(v, oblm, oblt, psi):
    cobm, sobm = math.cos(oblm), math.sin(oblm)
    cobt, sobt = math.cos(oblt), math.sin(oblt)
    cpsi, spsi = math.cos(psi), math.sin(psi)
    xx = cpsi
    yx = -spsi * cobm
    zx = -spsi * sobm
    xy = spsi * cobt
    yy = cpsi * cobm * cobt + sobm * sobt
    zy = cpsi * sobm * cobt - cobm * sobt
    xz = spsi * sobt
    yz = cpsi * cobm * sobt - sobm * cobt
    zz = cpsi * sobm * sobt + cobm * cobt
    return (xx * v[0] + yx * v[1] + zx * v[2], xy * v[0] + yy * v[1] + zy * v[2], xz * v[0] + yz * v[1] + zz * v[2])


def precise_apparent_sun(d, delta_t_seconds=None):
    """`delta_t_seconds`: what is added to UT for the ephemeris' time; ΔT itself when None."""
    if delta_t_seconds is None:
        delta_t_seconds = delta_t(d)
    tt = d + delta_t_seconds / 86400
    e = _earth_j2000(tt - 1 / C_AUDAY)
    dpsi, deps = _nutation(tt)
    mobl = _mean_obliquity(tt)
    oblm = (mobl / 3600) * RAD
    oblt = ((mobl + deps) / 3600) * RAD
    v = _nutate(_precess((-e[0], -e[1], -e[2]), tt), oblm, oblt, dpsi * ASEC2RAD)
    ra = math.atan2(v[1], v[0]) / RAD
    dec = math.atan2(v[2], math.hypot(v[0], v[1]))
    t = tt / 36525
    era = 360 * (math.fmod(0.779057273264 + 0.00273781191135448 * d + math.fmod(d, 1), 1) + 1)
    eqeq = dpsi * math.cos(oblm)
    st = eqeq + 0.014506 + ((((-0.0000000368 * t - 0.000029956) * t - 0.00000044) * t + 1.3915817) * t + 4612.156534) * t
    gast = era + st / 3600
    tmin = (d - math.floor(d + 0.5) + 0.5) * 1440
    eot_deg = math.fmod(math.fmod(gast - ra - (tmin - 720) / 4 + 180, 360) + 360, 360) - 180
    return dec, 4 * eot_deg
