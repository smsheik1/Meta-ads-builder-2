import sys
import xml.etree.ElementTree as ET

root = ET.parse(sys.argv[1]).getroot()
elements = {}
for element in root.findall('.//elements/element'):
    elements[element.get('id')] = {
        'name': element.get('elementName'),
        'folder': element.get('elementFolder'),
        'root': element.get('rootFolder'),
    }

columns = {}
for column in root.findall('.//columns/column'):
    if column.get('type') != '0':
        continue
    frame_one = None
    for seq in column.findall('elementSeq'):
        ranges = seq.get('exposures', '').split(',')
        for exposure in ranges:
            if '-' in exposure:
                start, end = map(int, exposure.split('-', 1))
            else:
                start = end = int(exposure)
            if start <= 1 <= end:
                frame_one = seq.get('val')
                break
        if frame_one is not None:
            break
    columns[column.get('name')] = (column.get('id'), frame_one)

def walk_group(group, prefix=''):
    name = group.get('name', 'Top')
    path = f'{prefix}/{name}'
    nodes = group.find('nodeslist')
    if nodes is None:
        return
    for node in nodes:
        if node.tag == 'group':
            walk_group(node, path)
            continue
        if node.tag != 'module' or node.get('type') != 'READ':
            continue
        col = node.find('./attrs/drawing/element').get('col')
        element_id, drawing = columns[col]
        element = elements[element_id]
        print('\t'.join([path, node.get('name'), col, element_id, element['name'], element['folder'], drawing or '-']))

walk_group(root.find('.//rootgroup'))
