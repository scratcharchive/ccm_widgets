class Surface3d:
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self.set_state(dict(status='running', status_message='Running'))

        self.set_state(dict(status='finished'))