import kachery as ka
import Clustering
import numpy as np

kachery_config=dict(
    url='http://132.249.245.245:24342',
    channel='public',
    password='public',
    download=True
)

path_data = 'sha1://cc6dbcd30a82dbdce756c9e2b27369bc7281755c/chang_pathbased.txt.conv'

def _load_dataset_data(path):
    with open(path, 'r') as f:
        txt = f.read()
    lines = txt.splitlines()
    data = []
    for line in lines:
        if line.startswith('// '):
            pass
        else:
            vals = line.split()
            data.append([_filter_val(val) for val in vals])
    return data


def _filter_val(str0):
    try:
        return float(str0)
    except:
        return str0

def ALG_dpclus(X):
    from scipy.spatial.distance import pdist, squareform
    import rlcluster as rlc
    D = squareform(pdist(X))
    result = rlc.cluster(D)
    labels = result.assignments # point i belongs to cluster a[i]
    return labels


def main():
    ka.set_config(**kachery_config)
    path2 = ka.load_file(path_data)
    data2 = _load_dataset_data(path2)
    labels2 = ALG_dpclus(data2)
    print(labels2)

if __name__ == '__main__':
    main()