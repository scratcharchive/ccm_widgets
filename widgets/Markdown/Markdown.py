import kachery as ka

class Markdown:
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        path = state.get('path', None)
        self._set_status('running', 'Loading markdown file {}'.format(path))
        txt = ka.load_text(path)
        if not txt:
            self._set_error('Unable to load text from file: {}'.format(path))
            return

        self._set_state(
            content=txt,
            status='finished',
            status_message=''
        )

    def _set_state(self, **kwargs):
        self.set_state(kwargs)
    
    def _set_error(self, error_message):
        self._set_status('error', error_message)
    
    def _set_status(self, status, status_message=''):
        self._set_state(status=status, status_message=status_message)