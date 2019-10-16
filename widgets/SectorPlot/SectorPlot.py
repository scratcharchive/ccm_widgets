from mountaintools import MountainClient
import numpy as np

class SectorPlot:
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self._set_status('running', 'Running SectorPlot')
        data_samples_path = state.get('data_samples_path', None)
        if not data_samples_path:
            self._set_error('Missing data_samples_path')
            return
        client = MountainClient()
        if state.get('download_from', None):
            client.configDownloadFrom(state.get('download_from'))

        print(data_samples_path)
        self._set_status('running', 'Realizing file: {}'.format(data_samples_path))
        path = client.realizeFile(data_samples_path)
        if not path:
            self._set_error('Unable to realize file: {}'.format(data_samples_path))
            return

        self._set_status('running', 'Loading file.')
        data_samples = np.load(path)
        print(data_samples.shape)
        
        self._set_state(
            data_samples=data_samples,
            status='finished',
            status_message=''
        )

    def _set_state(self, **kwargs):
        self.set_state(kwargs)
    
    def _set_error(self, error_message):
        self._set_status('error', error_message)
    
    def _set_status(self, status, status_message=''):
        self._set_state(status=status, status_message=status_message)
