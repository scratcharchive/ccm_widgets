import os
import json
import kachery as ka
import numpy as np

class Clustering:
    def __init__(self):
        super().__init__()
        self._algorithms = [
            dict(
                name='none',
                label='None',
                parameters=[]
            ),
            dict(
                name='kmeans',
                label='K-means',
                parameters=[
                    dict(
                        name='n_clusters',
                        choices=['true', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                        default='true'
                    )
                ]
            ),
            dict(
                name='dbscan',
                label='DBSCAN',
                parameters=[
                    dict(
                        name='eps',
                        choices=[0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 50, 100, 200, 300],
                        default=3
                    ),
                    dict(
                        name='min_samples',
                        choices=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                        default=2
                    )
                ]
            ),
            dict(
                name='affinitypropagation',
                label='Affinity propagation',
                parameters=[
                    dict(
                        name='damping',
                        choices=[0.5, 0.6, 0.7, 0.8, 0.9, 1],
                        default=0.5
                    )
                ]
            ),
            dict(
                name='meanshift',
                label='Mean shift',
                parameters=[
                    dict(
                        name='bandwidth',
                        choices=['auto', 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 50, 100, 200, 300],
                        default=3
                    )
                ]
            ),
            dict(
                name='spectralclustering',
                label='Spectral clustering',
                parameters=[
                ]
            ),
            dict(
                name='agglomerativeclustering',
                label='Agglomerative clustering',
                parameters=[
                    dict(
                        name='n_clusters',
                        choices=['true', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                        default='true'
                    )
                ]
            ),
            dict(
                name='isosplit',
                label='ISO-SPLIT',
                parameters=[
                ]
            ),
        ]
        self._alg_functions = dict(
            none=ALG_none,
            kmeans=ALG_kmeans,
            dbscan=ALG_dbscan,
            affinitypropagation=ALG_affinitypropagation,
            meanshift=ALG_meanshift,
            spectralclustering=ALG_spectralclustering,
            agglomerativeclustering=ALG_agglomerativeclustering,
            isosplit=ALG_isosplit
        )

    def javascript_state_changed(self, prev_state, state):
        self._set_status('running', 'Running clustering')

        alg_name = state.get('alg_name', 'none')
        alg_arguments = state.get('alg_arguments', dict())
        kachery_config = state.get('kachery_config', None)
        args0 = alg_arguments.get(alg_name, {})

        if kachery_config:
            ka.set_config(**kachery_config)

        dirname = os.path.dirname(os.path.realpath(__file__))
        fname = os.path.join(dirname, 'clustering_datasets.json')
        with open(fname, 'r') as f:
            datasets = json.load(f)
        for ds in datasets['datasets']:
            print('Loading {}'.format(ds['path']))
            path2 = ka.load_file(ds['path'])
            ka.store_file(path2)
            if path2:
                ds['data'] = self._load_dataset_data(path2)
                if alg_name:
                    print('Clustering...')
                    ds['labels'] = self._do_clustering(ds['data'], alg_name, args0, dict(true_num_clusters=ds['trueNumClusters']))
            else:
                print('Unable to realize file: {}'.format(ds['path']))

        self._set_state(
            algorithms=self._algorithms,
            datasets=datasets
        )

        self._set_status('finished', 'Finished clustering')

    def _load_dataset_data(self, path):
        with open(path, 'r') as f:
            txt = f.read()
        lines = txt.splitlines()
        data = []
        for line in lines:
            if line.startswith('// '):
                pass
            else:
                vals = line.split()
                data.append([self._filter_val(val) for val in vals])
        return data

    def _do_clustering(self, data, alg_name, args, opts):
        data=np.array(data)
        data=data[:, 1:]
        if alg_name in self._alg_functions:
            ret = self._alg_functions[alg_name](data, args, opts)
            return ret
        else:
            raise Exception('Unexpected alg_name: {}'.format(alg_name))
    
    def _filter_val(self, str0):
        try:
            return float(str0)
        except:
            return str0

    def on_message(self, msg):
        # process custom messages from JavaScript here
        # In .js file, use this.pythonInterface.sendMessage({...})
        pass
    
    # Send a custom message to JavaScript side
    # In .js file, use this.pythonInterface.onMessage((msg) => {...})
    def _send_message(self, msg):
        self.send_message(msg)

    # Set the python state
    def _set_state(self, **kwargs):
        self.set_state(kwargs)
    
    # Set error status with a message
    def _set_error(self, error_message):
        self._set_status('error', error_message)
    
    # Set status and a status message. Use running', 'finished', 'error'
    def _set_status(self, status, status_message=''):
        self._set_state(status=status, status_message=status_message)

def ALG_none(X, args, opts):
    N=X.shape[0]
    return np.zeros((N))

def ALG_kmeans(X, args, opts):
    from sklearn.cluster import KMeans
    import numpy as np
    n_clusters = args.get('n_clusters', 'true')
    if n_clusters == 'true':
        n_clusters = opts.get('true_num_clusters', 3)
    A = KMeans(n_clusters=n_clusters, random_state=0).fit(X)
    labels = A.labels_
    return labels

def ALG_dbscan(X, args, opts):
    from sklearn.cluster import DBSCAN
    import numpy as np
    K = opts.get('true_num_clusters', 3)
    eps = args.get('eps', 3)
    min_samples = args.get('min_samples', 2)
    A = DBSCAN(eps=eps, min_samples=min_samples).fit(X)
    labels = A.labels_
    return labels

def ALG_affinitypropagation(X, args, opts):
    from sklearn.cluster import AffinityPropagation
    import numpy as np
    damping = opts.get('damping', 0.5)
    A = AffinityPropagation(damping=damping).fit(X)
    labels = A.labels_
    return labels

def ALG_meanshift(X, args, opts):
    from sklearn.cluster import MeanShift
    import numpy as np
    bandwidth = opts.get('bandwidth', 'auto')
    if bandwidth == 'auto':
        bandwidth = None
    A = MeanShift(bandwidth=bandwidth).fit(X)
    labels = A.labels_
    return labels

def ALG_spectralclustering(X, args, opts):
    from sklearn.cluster import SpectralClustering
    import numpy as np
    A = SpectralClustering().fit(X)
    labels = A.labels_
    return labels

def ALG_agglomerativeclustering(X, args, opts):
    from sklearn.cluster import AgglomerativeClustering
    import numpy as np
    n_clusters = args.get('n_clusters', 'true')
    if n_clusters == 'true':
        n_clusters = opts.get('true_num_clusters', 3)
    A = AgglomerativeClustering(n_clusters=n_clusters).fit(X)
    labels = A.labels_
    return labels

def ALG_isosplit(X, args, opts):
    from isosplit5 import isosplit5
    labels = isosplit5(X.T)
    return labels