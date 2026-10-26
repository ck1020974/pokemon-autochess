"""Draw original, editable SVG battle environments. No image-generation assets."""
from pathlib import Path
import math
import random

ROOT = Path(__file__).resolve().parents[1]
GAME_ROOT = ROOT if (ROOT / 'src/presentation').is_dir() else ROOT / 'pokemon-autochess'
OUT = GAME_ROOT / 'src/assets/battle-scenes'
OUT.mkdir(parents=True, exist_ok=True)

def poly(points, fill, stroke='none', width=1, opacity=1):
    return f'<polygon points="{points}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'

def rect(x,y,w,h,fill,rx=0,opacity=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" opacity="{opacity}"/>'

def line(x1,y1,x2,y2,stroke,width=1,opacity=1):
    return f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}" fill="none"/>'

def circle(x,y,r,fill,stroke='none',width=1,opacity=1):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'

def ellipse(x,y,rx,ry,fill,stroke='none',width=1,opacity=1):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'

def path(d,fill='none',stroke='none',width=1,opacity=1):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" opacity="{opacity}"/>'

def defs(sky,far,floor,light):
    near_floor='#'+''.join(f'{round(int(floor[i:i+2],16)*.9):02x}' for i in [1,3,5])
    return f'''<defs>
    <linearGradient id="sky" x2="0" y2="1"><stop stop-color="{sky}"/><stop offset="1" stop-color="{far}"/></linearGradient>
    <linearGradient id="floor" x2="0" y2="1"><stop stop-color="{floor}"/><stop offset="1" stop-color="{near_floor}"/></linearGradient>
    <linearGradient id="stone"><stop stop-color="#354c66"/><stop offset=".28" stop-color="#6c879d"/><stop offset=".58" stop-color="#4c6782"/><stop offset="1" stop-color="#334c67"/></linearGradient>
    <linearGradient id="beam" x2="0" y2="1"><stop stop-color="{light}" stop-opacity=".22"/><stop offset="1" stop-color="{light}" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="{light}" stop-opacity=".38"/><stop offset="1" stop-color="{light}" stop-opacity="0"/></radialGradient>
    <radialGradient id="shade"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#173349" stop-opacity=".17"/></radialGradient>
    <pattern id="grain" width="71" height="59" patternUnits="userSpaceOnUse"><path d="M3 8h1m19 29h1m31-19h1m5 29h1" stroke="#fff" stroke-opacity=".08"/></pattern>
    </defs>'''

def floor(light='#7898b2',color='url(#floor)',ring=True):
    a=[rect(0,425,1920,655,color)]
    # A vanishing point above the sprite lane makes the floor read as physical space.
    for x in range(-3200,5300,340):
        a.append(line(960,390,x,1080,light,1,.13))
    for y in [439,458,484,519,568,636,730,858,1030]:
        a.append(line(0,y,1920,y,light,1,.14))
    if ring:
        a.extend([ellipse(960,607,620,104,'none',light,2,.2),ellipse(960,607,595,96,'none',light,1,.18)])
    return ''.join(a)

def light_source(x,y,color='#e9bf78',scale=1):
    return circle(x,y,60*scale,'url(#glow)')+path(f'M{x-4*scale} {y+8*scale} Q{x-10*scale} {y} {x+1*scale} {y-18*scale} Q{x+14*scale} {y-1*scale} {x+4*scale} {y+8*scale}',color)+rect(x-12*scale,y+9*scale,24*scale,6*scale,'#8e7652')

def hall():
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,330,600,400,'url(#glow)')]
    for w,h in [(810,650),(650,590),(480,520),(330,450)]:
        a.append(path(f'M{960-w} 470 V190 Q960 {-h} {960+w} 190 V470',stroke='#34465c',width=3,opacity=.65))
        a.append(path(f'M{971-w} 470 V194 Q960 {-h+35} {949+w} 194 V470',stroke='#b39b61',width=1,opacity=.3))
    for x,w,y in [(74,125,0),(310,95,45),(506,68,103),(662,45,164),(777,30,212)]:
        for mirror in [False,True]:
            xx=1920-x-w if mirror else x
            a.extend([rect(xx,y,w,438-y,'url(#stone)'),rect(xx+8,y,w*.12,438-y,'#5a718c',opacity=.24),rect(xx-12,421,w+24,21,'#1c2b41'),rect(xx-20,443,w+40,15,'#111e32'),line(xx+w*.8,y,xx+w*.8,422,'#c5a56b',1,.5)])
            a.append(path(f'M{xx+w*.32} {y+36} V{365} M{xx+w*.67} {y+36} V365',stroke='#7c91ab',width=1,opacity=.18))
    for x in [248,447,623,752,1168,1297,1473,1672]:
        a.extend([path(f'M{x-12} 130 Q{x} 88 {x+12} 130 V292 H{x-12}Z','#45688b',opacity=.5),poly(f'{x-12},160 {x+10},170 {x+220},555 {x-40},555','url(#beam)',opacity=.5)])
    a.extend([path('M860 405 V219 Q960 90 1060 219 V405Z','#15283b','#8f815b',2,.8),circle(960,271,76,'none','#bfab73',2,.75),circle(960,271,61,'none','#bfab73',1,.5),circle(960,271,41,'none','#bfab73',1,.5)])
    for k in range(12):
        t=k*math.pi/6
        a.append(line(960+46*math.cos(t),271+46*math.sin(t),960+72*math.cos(t),271+72*math.sin(t),'#e2c787',1,.75))
    a.extend([poly('960,221 974,257 1010,271 974,285 960,321 946,285 910,271 946,257','#d9bd77',opacity=.75),circle(960,271,13,'#f5dd9e'),rect(860,399,200,12,'#2d3d4c'),rect(843,413,234,10,'#344453')])
    a.append(floor('#bda774'))
    for x in [205,474,680,1240,1446,1715]:a.append(light_source(x,375,scale=.7 if 500<x<1400 else 1))
    return ''.join(a)

def garden(route=False):
    a=[rect(0,0,1920,1080,'url(#sky)')]
    # Layered woodland, without architectural arches or visible light shafts.
    for i,x in enumerate([-60,230,500,775,1085,1370,1635,1920]):
        y=190+(i*29)%90
        a.extend([rect(x+44,y,16,260,'#789987'),ellipse(x+50,y,87,101,'#8aaf91'),ellipse(x+13,y+25,63,70,'#94b99a')])
    for x,y,s in [(0,125,1.1),(360,185,.7),(1490,180,.75),(1870,100,1.2)]:
        a.extend([path(f'M{x+20*s} 480Q{x+48*s} {y+120*s} {x+28*s} {y}H{x+72*s}Q{x+90*s} {y+130*s} {x+62*s} 480Z','#5c8170'),ellipse(x+45*s,y,140*s,119*s,'#6d997c'),ellipse(x-16*s,y+40*s,115*s,88*s,'#7ba785'),ellipse(x+110*s,y+34*s,105*s,90*s,'#86af8c')])
    a.append(rect(0,425,1920,655,'url(#floor)'))
    return ''.join(a)

def country_road():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(350,112,1.1),cloud(1430,137,.9)]
    a.extend([path('M0 421L270 273 520 359 805 264 1080 375 1430 265 1690 340 1920 281V600H0Z','#8eafa0'),path('M0 451Q450 342 880 423T1580 383T1920 436V1080H0Z','url(#floor)'),path('M919 422H1007Q1256 550 935 690Q640 818 886 1080H90Q103 815 604 674Q1104 550 919 422Z','#ccbd9b'),path('M919 422Q1104 550 604 674Q103 815 90 1080',stroke='#e8ddbc',width=5,opacity=.45)])
    a.extend([rect(160,336,15,118,'#8e9279'),poly('135,352 135,318 280,318 310,336 280,352','#a8b49b')])
    return ''.join(a)

def volcanic():
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,350,680,400,'url(#glow)')]
    a.append(path('M0 0H1920V430L1670 389 1510 440 1320 378 1080 450 870 368 640 434 390 359 160 433 0 389Z','#6b5563'))
    for side in [0,1]:
        for i in range(5):
            x=i*128
            xx=x if not side else 1920-x-190
            h=420-i*45
            a.extend([poly(f'{xx},470 {xx+17},{470-h} {xx+90},{430-h} {xx+176},{470-h} {xx+190},470','#7a6772'),poly(f'{xx+90},{430-h} {xx+176},{470-h} {xx+190},470 {xx+98},449','#92717a'),line(xx+92,449,xx+90,440-h,'#e3844e',2,.35)])
    a.extend([path('M820 459L889 362 962 192 1043 367 1120 459Z','#2c1d29'),path('M916 330L962 192 1002 331 965 315Z','#fc9b55',opacity=.8),path('M964 318L931 388 969 409 940 468H1024L990 397Z','#ed7140',opacity=.65)])
    a.extend(['<defs><radialGradient id="heated-ground"><stop stop-color="#f6b66d" stop-opacity=".5"/><stop offset="1" stop-color="#f6b66d" stop-opacity="0"/></radialGradient></defs>',rect(0,425,1920,655,'url(#floor)'),ellipse(960,590,1000,380,'url(#heated-ground)')])
    for d in ['M0 790L270 740 425 803 690 759 905 804 1200 755 1515 812 1920 759','M125 1040L355 941 540 974 800 925 1030 974 1355 932 1720 989','M0 493L260 518 470 492 755 526 1030 500 1340 531 1620 505 1920 535']:
        a.append(path(d,stroke='#f9c37c',width=3,opacity=.4))
    rng=random.Random(76)
    for _ in range(80):a.append(circle(rng.randint(30,1890),rng.randint(80,480),rng.uniform(.8,2.8),'#ffb365',opacity=rng.uniform(.15,.7)))
    return ''.join(a)

def cavern(waterfall=False):
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,280,590,410,'url(#glow)')]
    a.append(path('M0 0H1920V475L1700 428 1560 304 1430 430 1305 176 1170 402 1000 96 807 383 651 140 494 409 342 269 170 440 0 469Z','#4e7186'))
    if waterfall:
        for x,w in [(745,80),(855,115),(1010,63),(1095,85)]:
            a.extend([path(f'M{x} 110 Q{x+30} 275 {x-8} 441H{x+w}Q{x+w+28} 260 {x+w-5} 110Z','#6bcdde',opacity=.35),line(x+w*.6,110,x+w*.7,437,'#c5f6f4',2,.5)])
    else:
        for x,y,h,w in [(120,435,230,85),(280,440,140,60),(540,430,95,40),(1300,445,120,45),(1500,440,170,70),(1760,442,270,105)]:
            a.extend([poly(f'{x-w},470 {x-w*.6},{y-h*.6} {x},{y-h} {x+w*.7},{y-h*.45} {x+w},470','#2a738d'),poly(f'{x},{y-h} {x+w*.7},{y-h*.45} {x+w},470 {x},443','#60c9df',opacity=.65),line(x,y-h,x,443,'#b3f1f8',2,.75)])
    a.append(floor('#5f91a5'))
    for x in [240,570,1350,1680]:a.append(ellipse(x,451,210,70,'url(#glow)',opacity=.45))
    return ''.join(a)

def glacier():
    a=[rect(0,0,1920,1080,'url(#sky)')]
    a.extend([path('M0 415L225 265 375 320 610 166 797 324 1050 123 1280 328 1470 237 1650 326 1920 210V530H0Z','#abcbd3'),poly('375,320 610,166 797,324 639,266 563,283','#e7f0e6'),poly('797,324 1050,123 1280,328 1122,268 1040,206 965,289','#ecf3ed')])
    for points,lit in [('0,430 0,245 95,220 172,288 242,255 330,320 430,290 530,422',False),('1390,430 1490,315 1570,338 1670,238 1770,268 1830,195 1920,237 1920,440',True)]:
        a.append(poly(points,'#93bdce' if lit else '#8ab2c5'))
    for x,y in [(65,273),(205,303),(365,340),(1540,365),(1710,280),(1870,250)]:a.append(path(f'M{x} {y}l-9 87 25 54',stroke='#d5e7e7',width=3,opacity=.5))
    a.append(rect(0,425,1920,655,'url(#floor)'))
    a.extend([path('M0 440Q450 467 910 437T1920 452',stroke='#e5f2eb',width=15,opacity=.5),path('M120 825L490 755 805 817 1110 757 1510 810 1810 748',stroke='#8eafbe',width=2,opacity=.24),path('M520 1080L710 930 805 817',stroke='#8eafbe',width=2,opacity=.2)])
    return ''.join(a)

def lakeside():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(480,103,1.2),cloud(1480,128,.8)]
    a.extend([path('M0 364Q340 184 680 329T1330 299T1920 331V470H0Z','#91b6a9'),path('M0 397Q360 288 760 369T1430 346T1920 381V500H0Z','#aac5ac'),rect(0,390,1920,250,'#91c3c9')])
    for y in [420,454,493]:a.append(path(f'M0 {y}q210 -4 420 0t420 0t420 0t420 0t420 0',stroke='#d0e5db',width=2,opacity=.45))
    a.extend([ellipse(350,423,110,15,'#9eb79e'),ellipse(1540,438,130,17,'#9eb79e'),rect(0,540,1920,540,'url(#floor)')])
    for x,y in [(90,570),(140,570),(1765,570),(1810,570)]:
        a.extend([line(x,y,x+8,y-65,'#7f9b7d',3),line(x,y-5,x-12,y-38,'#8ba482',2),rect(x+5,y-76,6,23,'#948c70',3)])
    return ''.join(a)

def harbor():
    a=[rect(0,0,1920,1080,'url(#sky)'),circle(1300,115,51,'#c9e4dc',opacity=.65),circle(1300,115,150,'url(#glow)'),rect(0,335,1920,190,'#214859')]
    for x in range(0,1920,23):
        h=12+(x*7)%75;a.extend([rect(x,345-h,18,h,'#173246'),rect(x+5,350-h,3,5,'#d9ba7a',opacity=.5)])
    a.extend([path('M1160 360H1560L1500 408H1230Z','#142b3d'),path('M1360 140V360M1370 164L1480 331H1370Z','#47667a','#7090a0',2,.8),path('M1348 182L1265 326H1348Z','#415d70'),path('M0 440 Q450 408 900 437T1920 424',stroke='#7bb7c7',width=2,opacity=.3)])
    a.append(floor('#6c98a8',ring=False))
    for x in range(100,1920,250):
        a.extend([rect(x,414,15,41,'#354b56'),ellipse(x+7,414,16,5,'#52636b')])
    for y in [360,379,402]:a.append(path(f'M0 {y}q160 -9 320 0t320 0t320 0t320 0t320 0t320 0',stroke='#a1ccd2',width=1,opacity=.15))
    return ''.join(a)

def library():
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,280,500,400,'url(#glow)')]
    rng=random.Random(12)
    for side in [False,True]:
        for i,(x,w,h) in enumerate([(10,255,440),(287,180,375),(488,135,315),(642,90,260)]):
            xx=1920-x-w if side else x;y=445-h
            a.extend([rect(xx,y,w,h,'#211d29'),rect(xx+12,y+15,w-24,h-20,'#100f1e'),rect(xx,y,w,10,'#8f785d')])
            for yy in range(y+45,440,54):
                a.append(rect(xx+5,yy,w-10,5,'#725d4a'))
                for bx in range(int(xx+16),int(xx+w-10),13):a.append(rect(bx,yy-rng.randint(22,39),rng.randint(6,10),30,rng.choice(['#40536a','#725856','#8b7859','#425f5a','#786b7b'])))
    a.extend([path('M825 445V180Q960 30 1095 180V445','#302837','#897357',3),circle(960,248,87,'none','#ac9266',2,.7),circle(960,248,66,'none','#ac9266',1,.4),path('M908 250Q934 226 960 245Q986 226 1012 250V290Q985 272 960 292Q935 272 908 290Z','#ad9367',opacity=.55)])
    a.append(floor('#b09774'))
    for x in [200,520,1400,1720]:a.append(light_source(x,350,scale=.8))
    return ''.join(a)

def stadium():
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,260,650,370,'url(#glow)')]
    for y,rx in [(320,1030),(355,1070),(390,1110)]:a.append(ellipse(960,y,rx,155,'none','#42647b',21,.5))
    for x in [130,440,1480,1790]:
        a.extend([path(f'M{x-12} 450L{x+10} 86H{x+25}L{x+17} 450Z','#22384f'),rect(x-65,85,140,37,'#273a4c',5)])
        for j in range(7):a.append(rect(x-55+j*18,94,11,14,'#c1e8e6',2,.8))
        a.append(poly(f'{x-55},125 {x+55},125 {x+240},560 {x-240},560','url(#beam)',opacity=.7))
    a.append(rect(750,165,420,160,'#172c43',15))
    a.extend([rect(760,175,400,140,'#254b63',9),circle(960,243,43,'none','#97c5d0',3,.5),line(916,243,1004,243,'#97c5d0',3,.5)])
    a.append(floor('#8bbcb9'))
    a.extend([ellipse(960,615,510,95,'none','#a5c9c3',3,.3),line(960,470,960,1080,'#a5c9c3',2,.15)])
    return ''.join(a)

def cloud(x,y,s=1):
    return ellipse(x,y,105*s,25*s,'#f4f8ed',opacity=.65)+ellipse(x-35*s,y-20*s,48*s,40*s,'#f4f8ed',opacity=.65)+ellipse(x+35*s,y-15*s,65*s,35*s,'#f4f8ed',opacity=.65)

def natural_floor(color='#8db38b',sand=False):
    a=[rect(0,425,1920,655,'url(#floor)')]
    for i,y in enumerate([463,525,618,765,975]):
        a.append(path(f'M-50 {y} Q420 {y-40-i*8} 960 {y+8} T1970 {y-8}',stroke=color,width=2,opacity=.2 if sand else .12))
    return ''.join(a)

def harbor_day():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(400,120,1.4),cloud(1220,90,.8),circle(1530,116,60,'#ffedbf',opacity=.75),rect(0,305,1920,235,'#72b4c6')]
    # Identifiable waterfront architecture and broad boats, with no obstructions in the combat lane.
    for x,w,h,color in [(65,145,135,'#d5bd9b'),(225,185,175,'#d9d6bd'),(425,135,120,'#b7c9c6'),(575,160,155,'#d7c7b4')]:
        a.extend([rect(x,310-h,w,h,color,3),poly(f'{x-10},{310-h} {x+w/2},{270-h} {x+w+10},{310-h}','#7295a1')])
        for wx in range(x+20,x+w-10,36):a.extend([rect(wx,330-h,16,26,'#688f9f',2),rect(wx,370-h,16,26,'#688f9f',2)])
    a.extend([rect(1645,145,58,175,'#e6e4ce'),rect(1638,175,72,25,'#cc8374'),poly('1635,146 1674,107 1713,146','#6a8896'),rect(1656,152,35,19,'#9ebfc5'),line(1674,110,1674,70,'#698591',3),poly('1674,70 1720,82 1674,96','#d79879')])
    for x,s in [(1000,1),(1350,.7)]:
        a.extend([path(f'M{x-115*s} 344H{x+145*s}L{x+110*s} 383H{x-60*s}Z','#5f8d9e'),line(x,194,x,345,'#678897',4),poly(f'{x+8*s},{204} {x+8*s},333 {x+110*s},333','#f4ead5'),poly(f'{x-8*s},218 {x-8*s},333 {x-83*s},333','#d4e4dc')])
    for y in [332,366,402]:a.append(path(f'M0 {y}q160 -7 320 0t320 0t320 0t320 0t320 0t320 0',stroke='#d7eee4',width=2,opacity=.35))
    a.append(floor('#c8d5cd'))
    # Connected quay railing replaces the isolated bollards and striped canopies.
    for x in range(20,1920,105):a.extend([rect(x,390,11,70,'#78969a',3),rect(x-3,387,17,7,'#cedbd0',2)])
    a.extend([rect(0,399,1920,8,'#91aaab',2),rect(0,433,1920,6,'#91aaab',2)])
    return ''.join(a)

def library_day():
    a=[rect(0,0,1920,1080,'#a9c3be'),rect(100,30,1720,390,'#d8d9c5',10),rect(135,66,1650,348,'#c3cec1',6)]
    a.extend([path('M675 315V152Q960 -55 1245 152V315Z','#eaf0d8','#839f9b',12),path('M700 303V166Q960 -15 1220 166V303Z','#a8d4d0')])
    for x in [785,960,1135]:a.append(line(x,112 if x!=960 else 58,x,303,'#e4e5cb',12))
    a.extend([line(700,220,1220,220,'#e4e5cb',12),rect(657,311,606,16,'#e8e4cd',4),rect(684,330,552,84,'#c8cdbb',4),line(684,414,1236,414,'#a6b3a4',5)])
    rng=random.Random(22)
    for side in [False,True]:
        x=150 if not side else 1350
        a.extend([rect(x,118,420,310,'#ad8f71',8),rect(x+14,131,392,275,'#c3b291',4)])
        for y in [205,300,395]:
            a.append(rect(x+8,y,404,11,'#927a62',2))
            for i in range(12):
                xx=x+28+i*31;h=rng.randint(43,65)
                a.extend([rect(xx,y-h,19,h,rng.choice(['#709d9c','#c38e83','#b4b78b','#8ba3b1','#c9b783']),2),line(xx+4,y-h+9,xx+15,y-h+9,'#e8dfbd',1,.6)])
    a.append(floor('#c9bb9d'))
    for x in [80,1800]:
        a.extend([rect(x,373,46,65,'#a59d80',8),ellipse(x+22,363,47,38,'#7ca38b'),ellipse(x-5,340,25,38,'#87ae90'),ellipse(x+44,334,27,40,'#95b693')])
    a.extend([ellipse(960,150,36,36,'#edf0d9','#a2ae97',3),line(960,150,960,128,'#7d958e',3),line(960,150,979,158,'#7d958e',3)])
    return ''.join(a)

def grassland():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(320,135,1.2),cloud(1350,100,1.5),circle(1590,148,54,'#fff0b6',opacity=.8)]
    a.extend([path('M0 421Q330 170 650 345T1270 304T1920 326V540H0Z','#8db28d'),path('M0 435Q390 300 770 402T1370 362T1920 410V550H0Z','#abc58f'),natural_floor('#c6d6a1')])
    rng=random.Random(36)
    for _ in range(110):
        x=rng.randrange(1920);y=rng.randrange(735,1070)
        a.append(path(f'M{x} {y}q-9 -15 -10 -20M{x} {y}q4 -18 12 -23',stroke='#779c76',width=2,opacity=.25))
    for x,y in [(85,740),(1780,750),(230,955),(1675,965)]:
        a.extend([circle(x,y,3,'#f1df9b'),circle(x+13,y-8,3,'#e8e9c4'),circle(x-14,y+7,3,'#f1df9b')])
    return ''.join(a)

def desert():
    a=[rect(0,0,1920,1080,'url(#sky)'),circle(1440,145,66,'#fff0be',opacity=.8)]
    a.extend([path('M0 425Q400 260 785 383T1410 322T1920 411V560H0Z','#d0ad85'),path('M0 452Q420 340 905 434T1590 389T1920 442V590H0Z','#e1c291'),natural_floor('#f0d5a4',True)])
    for x,s in [(45,1),(280,.7),(1580,.75),(1780,1.1)]:
        a.extend([poly(f'{x},443 {x+15*s},{443-220*s} {x+93*s},{443-240*s} {x+135*s},443','#ba987c'),poly(f'{x+93*s},{443-240*s} {x+135*s},443 {x+75*s},443','#c9aa87'),line(x+22*s,370,x+92*s,370,'#987f71',2,.2)])
    for x,y in [(150,875),(1700,790),(400,1020)]:a.append(ellipse(x,y,45,9,'#b89a7c',opacity=.2))
    return ''.join(a)

def palm(x,y,s=1,flip=1):
    a=[path(f'M{x} {y}q{25*s*flip} {-115*s} {70*s*flip} {-230*s}',stroke='#a68e72',width=19*s)]
    cx=x+70*s*flip;cy=y-230*s
    for dx,dy in [(-130,0),(-90,-63),(0,-90),(100,-60),(140,0),(75,50)]:
        a.append(path(f'M{cx} {cy}Q{cx+dx*s*.5} {cy+(dy-35)*s} {cx+dx*s} {cy+dy*s}Q{cx+dx*s*.5} {cy+(dy+18)*s} {cx} {cy}Z','#729c81'))
    return ''.join(a)

def beach():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(620,95,1.2),cloud(1400,140,.9),rect(0,312,1920,250,'#83c4ca')]
    a.append(path('M0 440Q500 505 1020 422T1920 468V1080H0Z','url(#floor)'))
    a.extend([palm(65,451,1.15),palm(1850,452,1.05,-1)])
    for x,y,rx in [(80,830,60),(1780,900,50),(140,1015,36)]:a.append(ellipse(x,y,rx,9,'#c4b798',opacity=.25))
    return ''.join(a)

def ocean():
    a=[rect(0,0,1920,1080,'url(#sky)'),ellipse(960,80,850,320,'url(#glow)')]
    a.extend([path('M0 425L175 330 310 405 470 361 640 420 820 348 1040 414 1230 345 1450 407 1670 330 1920 423V570H0Z','#79aeb7'),natural_floor('#c2e3d5')])
    for x,y,s in [(370,176,1),(1360,126,.8),(1510,214,.65)]:
        a.append(path(f'M{x-9*s} {y}q{5*s} {-6*s} {9*s} 0q{4*s} {-6*s} {9*s} 0',stroke='#4c7181',width=2))
    for x in [380,1450]:a.extend([rect(x,316,37,120,'#9bbab6',6),rect(x-10,311,57,12,'#bad1c3',3)])
    for y in [515,663,865]:a.append(path(f'M0 {y}q160 -13 320 0t320 0t320 0t320 0t320 0t320 0',stroke='#d9eee3',width=2,opacity=.3))
    rng=random.Random(75)
    for _ in range(38):a.append(circle(rng.randrange(35,1885),rng.randrange(80,400),rng.randrange(2,5),'none','#d4ede3',1,.35))
    return ''.join(a)

def prep_room(center=False):
    wall='#eadbca' if center else '#c6dfe3'
    accent='#ba8e8b' if center else '#78a8b9'
    a=[rect(0,0,1920,1080,wall),rect(0,0,1920,55,accent),rect(0,55,1920,350,wall)]
    for x in [200,1300]:
        a.extend([rect(x,112,420,252,'#f1eee0',13),rect(x+14,126,392,224,'#a8d2d1',6),line(x+210,127,x+210,348,'#f1eee0',10),line(x+15,238,x+405,238,'#f1eee0',8)])
        a.append(path(f'M{x+15} 320Q{x+130} 255 {x+210} 300T{x+405} 287V350H{x+15}Z','#99baa5',opacity=.7))
    a.extend([rect(774,112,372,300,accent,11),rect(797,132,326,271,'#d4e7df' if center else '#9bbcc4',6),line(960,134,960,402,'#eff2e3',8),circle(941,286,5,'#668e96'),circle(979,286,5,'#668e96'),floor('#c4c3b3',ring=False)])
    for side in [0,1]:
        x=35 if not side else 1740
        a.extend([rect(x,263,146,164,'#a7bba9' if center else '#91aeb8',7),rect(x+9,280,128,12,'#eef1dd',3),rect(x+9,350,128,12,'#eef1dd',3)])
        for xx in [x+20,x+62,x+102]:a.extend([rect(xx,304,21,36,'#e2c7a3',4),rect(xx,374,21,35,'#c9dfca',4)])
    return ''.join(a)

def prep_camp():
    a=[rect(0,0,1920,1080,'url(#sky)'),cloud(1060,90,1.4)]
    for i,x in enumerate(range(-30,1980,150)):
        h=170+(i*47)%125
        a.extend([rect(x+44,425-h,14,h,'#8b977f'),poly(f'{x-35},395 {x+50},{330-h} {x+135},395','#8ca995'),poly(f'{x-20},342 {x+50},{310-h} {x+120},342','#9ab49c')])
    a.append(natural_floor('#cfceb0'))
    for x,flip in [(30,1),(1580,-1)]:
        a.extend([poly(f'{x},445 {x+155},232 {x+310},445','#bca789'),poly(f'{x+155},232 {x+310},445 {x+165},445','#cfbea1'),poly(f'{x+92},445 {x+151},320 {x+204},445','#647f7c'),line(x+155,232,x+155,445,'#eee2bc',3,.7)])
    for x in [400,1390]:a.extend([rect(x,390,132,17,'#a69277',4),rect(x+12,407,10,35,'#8b816e'),rect(x+110,407,10,35,'#8b816e')])
    a.extend([ellipse(962,437,47,12,'#9b9a85'),path('M936 436L989 421M939 421L986 437',stroke='#8e806a',width=7),path('M954 432Q942 420 958 403Q976 415 968 432Z','#d9b080',opacity=.75)])
    return ''.join(a)

def prep_lab():
    a=[rect(0,0,1920,1080,'#d8e3db'),rect(0,0,1920,40,'#88aab0'),rect(0,405,1920,24,'#b1c5ba')]
    # A wide observation window and workstations clearly distinguish the lab from the shop.
    a.extend([rect(130,85,480,230,'#f1f0df',10),rect(146,101,448,198,'#a5cccd',4),line(370,102,370,299,'#eef0df',8),path('M146 276Q260 219 371 262T594 252V299H146Z','#a3bfa9')])
    # Chalk sketches replace the cabinet. The central wall stays clear of screens.
    a.extend([rect(1300,80,500,240,'#a5a18a',8),rect(1312,92,476,216,'#476257',4),rect(1301,317,498,10,'#b9ae90',3)])
    chalk='#dce5cf'
    a.append('<g stroke-linecap="round" stroke-linejoin="round">')
    a.extend([circle(1395,170,35,'none',chalk,2,.85),line(1360,170,1430,170,chalk,2,.85),circle(1395,170,9,'none',chalk,2,.85),path('M1375 223q17 -8 45 -3m-53 10 67 2m-52 12 39 -1',stroke=chalk,width=2,opacity=.65)])
    a.extend([path('M1490 243q-24 -46 2 -98q45 10 47 45q-4 36 -47 53m0 -1 31 -69m-22 36 -15 -14m23 3 23 -3',stroke=chalk,width=2,opacity=.8),path('M1456 180q16 -13 29 -3m-8 -6 10 6 -8 6',stroke=chalk,width=2,opacity=.75)])
    for x,y,r in [(1612,145,13),(1687,173,17),(1629,237,16),(1741,238,11)]:a.append(circle(x,y,r,'none',chalk,2,.8))
    a.extend([line(1624,150,1672,168,chalk,2,.8),line(1678,187,1639,223,chalk,2,.8),line(1645,237,1730,238,chalk,2,.8),line(1699,185,1734,227,chalk,2,.8),path('M1574 272l43 -2m15 1 67 2m-46 -161 76 3',stroke=chalk,width=2,opacity=.55)])
    a.append('</g>')
    # Three small display plinths, with red upper and white lower ball halves.
    for x in [800,960,1120]:
        a.extend([rect(x-31,389,62,36,'#b2c8be',4),ellipse(x,390,31,7,'#e9ecdc'),circle(x,364,23,'#f5f3e6','#788c8a',2),path(f'M{x-23} 364A23 23 0 0 1 {x+23} 364Z','#c76d63'),line(x-23,364,x+23,364,'#647c7a',3),circle(x,364,7,'#f5f3e6','#647c7a',2)])
    a.append(floor('#d3d6bf',ring=False))
    return ''.join(a)

def hall_variant(name):
    palettes={
      'lilac':['#44465e','#aeaec6','#72728e','#3c4059'],
      'gold':['#a8b5b8','#fffdf0','#e3e2d5','#8e9fa6'],
    }
    stone=palettes[name]
    s=hall().replace('url(#stone)',f'url(#{name}-stone)')
    colors={
      'lilac':{'#34465c':'#4e4b68','#1c2b41':'#424158','#111e32':'#313449','#45688b':'#7d809e','#15283b':'#39354e','#5a718c':'#aaa8c0','#2d3d4c':'#736e85','#344453':'#8a839a'},
      'gold':{'#34465c':'#ccba82','#1c2b41':'#b59b61','#111e32':'#6e654f','#45688b':'#567982','#15283b':'#253c48','#5a718c':'#fff8e7','#2d3d4c':'#a89461','#344453':'#c8b581','#c5a56b':'#e4c16d','#bfab73':'#e9c66f','#b39b61':'#f2d48b','#8f815b':'#c0a16b'},
    }
    for old,new in colors[name].items():s=s.replace(old,new)
    return f'<defs><linearGradient id="{name}-stone"><stop stop-color="{stone[0]}"/><stop offset=".28" stop-color="{stone[1]}"/><stop offset=".58" stop-color="{stone[2]}"/><stop offset="1" stop-color="{stone[3]}"/></linearGradient></defs>'+s

def stadium_coral():
    s=stadium()
    for old,new in [('#42647b','#bb9891'),('#22384f','#a57f7e'),('#273a4c','#ba8d89'),('#172c43','#9a777b'),('#254b63','#c49d98'),('#7090a0','#d8c9b7')]:s=s.replace(old,new)
    return stadium_emblem(s,'#705058')

def stadium_emblem(s,ink):
    s=s.replace(circle(960,243,43,'none','#97c5d0',3,.5),circle(960,243,45,'none',ink,5,.95))
    return s.replace(line(916,243,1004,243,'#97c5d0',3,.5),line(915,243,1005,243,ink,4,.95)+circle(960,243,12,'#e9eee1',ink,4,.95))

def stadium_variant(name):
    palettes={
      'mint':['#82aaa0','#5e8f85','#77a497','#537e77','#a4c6b3'],
      'lilac':['#a59dbd','#817e9d','#9990ad','#716b88','#bdb1ce'],
      'gold':['#c3ad81','#a7956f','#b6a47b','#978568','#d4c39c'],
    }
    s=stadium()
    for old,new in zip(['#42647b','#22384f','#273a4c','#172c43','#254b63'],palettes[name]):s=s.replace(old,new)
    return stadium_emblem(s,{'mint':'#365d51','lilac':'#514762','gold':'#6b5634'}[name])

SCENES={
 'champion-hall':(hall,('#496b8c','#99b6c5','#7899af','#ffe3ab')),
 'garden':(garden,('#7da393','#b8cbb2','#a1b69b','#f1efbf')),
 'route':(country_road,('#9fc3c6','#d3dfbd','#a7bd98','#fff0c0')),
 'volcanic':(volcanic,('#775e6b','#c0887b','#c58a69','#ffbd7b')),
 'cavern':(glacier,('#9cbeca','#e0ebdf','#bfd6d4','#f1fbf1')),
 'waterfall':(lakeside,('#a1c7ce','#d6e0c7','#bfd0b4','#eff7d7')),
 'harbor':(harbor_day,('#8ebdca','#d1e3d6','#a5b8b4','#fff0c4')),
 'library':(library_day,('#9fbdb9','#e5ddc2','#bdb89f','#fff4c9')),
 'stadium':(lambda:stadium_emblem(stadium(),'#b8e0e2'),('#648da5','#bed6d2','#93b5bc','#e0f1d8')),
 'grassland':(grassland,('#8ebec4','#d6e4bf','#bad19e','#fff3bb')),
 'desert':(desert,('#a6c6c5','#f4d8b2','#e0bd8e','#fff0bf')),
 'beach':(beach,('#a0cdd1','#dce9d4','#e7d5ac','#fff0be')),
 'ocean':(ocean,('#7db8c8','#bfe1d7','#a2cacc','#e6f6db')),
 'stadium-coral':(stadium_coral,('#c29192','#f0cfba','#d0b0a4','#fff0d1')),
 'prep-mart':(prep_room,('#a8c9ce','#e0e6d1','#ced6c3','#fff4d3')),
 'prep-center':(lambda:prep_room(True),('#c7b5ab','#eee0cd','#d8cbb6','#fff1d0')),
 'prep-road':(prep_camp,('#91b6ae','#cad7b7','#bfb393','#fff1bd')),
 'stadium-mint':(lambda:stadium_variant('mint'),('#91bbb0','#d3e3cd','#aecab6','#f0f6d9')),
 'stadium-lilac':(lambda:stadium_variant('lilac'),('#b5adc8','#e2d6dc','#c5b9ce','#fff0de')),
 'stadium-gold':(lambda:stadium_variant('gold'),('#c6b58d','#eee0ba','#d6c397','#fff3cf')),
 'prep-lab':(prep_lab,('#afc9c4','#e0e6d4','#d0d7c3','#fff3d2')),
 'champion-hall-lilac':(lambda:hall_variant('lilac'),('#525973','#a7b1c3','#aeb8c7','#ffe5a8')),
 'champion-hall-gold':(lambda:hall_variant('gold'),('#344b58','#82999a','#d9ddd6','#ffde97')),
}

SCENE_INFO=[
 ('champion-hall','冠軍殿堂','battle','已確認'),('garden','森林','battle','微調'),
 ('volcanic','熔岩場','battle','微調'),('cavern','冰川','battle','微調'),
 ('library','圖書館','battle','微調'),('waterfall','湖畔','battle','微調'),
 ('harbor','海港','battle','微調'),('stadium','競技場・青藍','battle','已確認'),
 ('route','鄉間道路','battle','微調'),('grassland','草原','battle','已確認'),
 ('desert','沙漠','battle','微調'),('beach','海灘','battle','微調'),
 ('ocean','海洋','battle','微調'),('stadium-coral','競技場・珊瑚','battle','已確認'),
 ('prep-mart','備戰區・商店','preparation','微調'),
 ('prep-center','備戰區・休息中心','preparation','微調'),
 ('prep-road','備戰區・林間營地','preparation','微調'),
 ('stadium-mint','競技場・薄荷','battle','新增'),
 ('stadium-lilac','競技場・薰衣草','battle','新增'),
 ('stadium-gold','競技場・金砂','battle','新增'),
 ('prep-lab','備戰區・研究所','preparation','新增'),
 ('champion-hall-lilac','冠軍殿堂・薰衣草','battle','新增'),
 ('champion-hall-gold','冠軍殿堂・白金','battle','新增'),
]

if __name__=='__main__':
    import json
    import xml.etree.ElementTree as ET
    for name,(draw,palette) in SCENES.items():
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" fill="none"><title>{name} battle environment</title>'+defs(*palette)+draw()+rect(0,0,1920,1080,'url(#grain)')+rect(0,0,1920,1080,'url(#shade)')+'</svg>'
        ET.fromstring(svg)
        (OUT/f'{name}.svg').write_text(svg,encoding='utf-8')
        print(f'Drawn {name}.svg ({len(svg):,} characters)')
    assert set(SCENES)=={row[0] for row in SCENE_INFO}
    (OUT/'catalog.json').write_text(json.dumps([dict(zip(['id','title','kind','status'],row)) for row in SCENE_INFO],ensure_ascii=False,indent=2),encoding='utf-8')
    rules=['/* Generated scene asset bindings. Rebuild with scripts/draw_battle_scenes.py. */']
    for name,title,kind,status in SCENE_INFO:
        if kind=='preparation':
            rules.append(f'.prep-scene--{name.removeprefix("prep-")}, body:has(.game-container.prep-scene--{name.removeprefix("prep-")}:not(.is-battling)) {{ --preparation-scene-illustration: url(\'../assets/battle-scenes/{name}.svg\'); }}')
        else:
            light=SCENES[name][1][3].lstrip('#');rgb=', '.join(str(int(light[i:i+2],16)) for i in [0,2,4])
            ink='#edf6f8' if name in {'champion-hall','volcanic'} else '#244655'
            shadow='rgba(3, 17, 31, .65)' if ink=='#edf6f8' else 'rgba(255, 255, 255, .5)'
            panel='rgba(16, 32, 48, .15)' if ink=='#edf6f8' else 'rgba(247, 251, 239, .35)'
            # Messages sit on the floor; the header/sky palette can have opposite brightness.
            ground=SCENES[name][1][2].lstrip('#')
            channels=[int(ground[i:i+2],16)/255 for i in [0,2,4]]
            linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in channels]
            luminance=sum(v*w for v,w in zip(linear,[.2126,.7152,.0722]))
            log_ink='#000' if (luminance+.05)/.05 >= 1.05/(luminance+.05) else '#fff'
            log_shadow='0 1px 2px rgba(255, 255, 255, .65)' if log_ink=='#000' else '0 1px 3px rgba(0, 0, 0, .8)'
            rules.append(f'.battle-scene--{name}, body:has(.game-container.is-battling.battle-scene--{name}) {{ --battle-scene-illustration: url(\'../assets/battle-scenes/{name}.svg\'); --battle-light: {rgb}; --scene-ui-ink: {ink}; --scene-ui-shadow: {shadow}; --scene-ui-panel: {panel}; --scene-log-ink: {log_ink}; --scene-log-shadow: {log_shadow}; }}')
    (OUT.parent.parent/'presentation/sceneAssets.css').write_text('\n'.join(rules)+'\n',encoding='utf-8')
