"""Print an RDF/XML document as sorted lines with blank nodes as "_" (same form as check-rdfxml.html).
Usage: python3 test/rdflib-canon.py <path-or-url> [base]"""
import json, sys
import rdflib

def term(t):
    if isinstance(t, rdflib.BNode):
        return '_'
    if isinstance(t, rdflib.URIRef):
        return f'<{t}>'
    s = json.dumps(str(t), ensure_ascii=False)
    if t.language:
        return f'{s}@{t.language}'
    if t.datatype and str(t.datatype) != 'http://www.w3.org/2001/XMLSchema#string':
        return f'{s}^^<{t.datatype}>'
    return s

src = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else src
g = rdflib.Graph()
g.parse(src, format='xml', publicID=base)
lines = sorted(' '.join(term(x) for x in tr) for tr in g)
print(len(lines))
print('\n'.join(lines))
