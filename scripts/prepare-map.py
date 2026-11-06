"""Convert the attributed HDX shapefile and six GeoNames records to a compact source GeoJSON.
Usage: python scripts/prepare-map.py HDX.zip KZ.zip data/map-geography.json
Development dependency: pyshp==2.3.1. Runtime site has no GIS dependency.
"""
import json, math, sys, tempfile, zipfile
from pathlib import Path
import shapefile

R = 6378137.0
def lonlat(point):
    x, y = point[:2]
    return [round(math.degrees(x / R), 6), round(math.degrees(2 * math.atan(math.exp(y / R)) - math.pi / 2), 6)]

def simplify(points, tolerance=1100):
    if len(points) < 4: return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    def distance(p):
        t = max(0, min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy)/length)) if length else 0
        return math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dy)
    index = max(range(1, len(points)-1), key=lambda i: distance(points[i]))
    if distance(points[index]) > tolerance:
        return simplify(points[:index+1],tolerance)[:-1] + simplify(points[index:],tolerance)
    return [a,b]

def ring(points):
    reduced = simplify(points)
    if len(reduced) < 4: reduced = points
    return [lonlat(p) for p in reduced]

ids = {'almaty':'1526384','astana':'1526273','aktau':'610612','ust-kamenogorsk':'1520316','burabay':'1525126','turkistan':'1517945'}
with zipfile.ZipFile(sys.argv[2]) as gazetteer:
    rows={f[0]:f for line in gazetteer.read('KZ.txt').decode().splitlines() for f in [line.split('\t')] if f[0] in ids.values()}
    assert len(rows)==6
    points={key:{'coordinates':[float(rows[id][5]),float(rows[id][4])], 'geonamesId':id, 'sourceName':rows[id][1], 'sourceURL':f'https://www.geonames.org/{id}/'} for key,id in ids.items()}

with tempfile.TemporaryDirectory() as directory:
    with zipfile.ZipFile(sys.argv[1]) as archive:
        members=[n for n in archive.namelist() if 'adm1_unhcr_2023' in n and Path(n).suffix in {'.shp','.shx','.dbf','.prj','.cpg'}]
        archive.extractall(directory,members=members)
    source=next(Path(directory).rglob('*.shp'))
    assert 'Web_Mercator' in source.with_suffix('.prj').read_text()
    reader=shapefile.Reader(str(source),encoding='utf-8')
    features=[]
    for record in reader.iterShapeRecords():
        geometry=record.shape.__geo_interface__
        geometry['coordinates'] = [ring(r) for r in geometry['coordinates']] if geometry['type']=='Polygon' else [[ring(r) for r in p] for p in geometry['coordinates']]
        props=record.record.as_dict()
        features.append({'type':'Feature','properties':{'code':props['ADM1_PCODE'],'name':props['ADM1_EN']},'geometry':geometry})
    assert len(features)==20
    payload={'type':'FeatureCollection','features':features,'points':points,'source':{'boundaries':'UNHCR / HDX COD-AB Kazakhstan, 2023; metadata reviewed January 2024','boundaryURL':'https://data.humdata.org/dataset/cod-ab-kaz','boundaryLicense':'CC BY 3.0 IGO','boundaryLicenseURL':'https://creativecommons.org/licenses/by/3.0/igo/','gazetteer':'GeoNames','gazetteerURL':'https://www.geonames.org/','gazetteerLicense':'CC BY 4.0','retrievedDate':'2026-10-12','modification':'EPSG:3857 inverted to WGS84; outlines simplified at 1100 metres for overview display'}}
    output=Path(sys.argv[3]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f'Prepared {len(features)} regions, {len(points)} destination points, {output.stat().st_size} bytes')
