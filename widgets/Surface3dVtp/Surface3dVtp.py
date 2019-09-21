from mountaintools import client as mt
from vtk.util.numpy_support import vtk_to_numpy
from vtk import vtkXMLPolyDataReader


class Surface3dVtp:
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self.set_state(dict(status='running', status_message='Running'))

        vtp_path = state.get('vtp_path', None)
        download_from = state.get('download_from', None)
        scalar_info = state.get('scalar_info', None)
        vector_field_info = state.get('vector_field_info', None)
        arrow_subsample_factor = state.get('arrow_subsample_factor', None)

        if not vtp_path:
            self.set_state(dict(status='error', status_message='No vtp_path'))
            return
        
        if download_from:
            mt.configDownloadFrom(download_from)
        fname = mt.realizeFile(path=vtp_path)

        reader = vtkXMLPolyDataReader()
        reader.SetFileName(fname)
        reader.Update()
        X = reader.GetOutput()
        vertices = vtk_to_numpy(X.GetPoints().GetData()).T
        faces = vtk_to_numpy(X.GetPolys().GetData())

        if scalar_info:
            scalars = vtk_to_numpy(X.GetPointData().GetArray(scalar_info['name']))
            scalars = scalars[:, scalar_info['component']]
        else:
            scalars = None

        if vector_field_info:
            vector_field = vtk_to_numpy(X.GetPointData().GetArray(vector_field_info['name']))
            vector_field = vector_field[:, vector_field_info['components']]
            arrows = [
                dict(
                    start=vertices[:, j] - vector_field[j, :].T / 2,
                    end=vertices[:, j] + vector_field[j, :].T / 2
                )
                for j in range(0, vector_field.shape[0], arrow_subsample_factor)
            ]                
        else:
            arrows = None
            
        self.set_state(dict(
            status='finished',
            vertices=vertices,
            faces=faces,
            scalars=scalars,
            arrows=arrows
        ))
