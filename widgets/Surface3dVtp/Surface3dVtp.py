from reactopya import Component
from mountaintools import client as mt
import base64
from vtk.util.numpy_support import vtk_to_numpy
from vtk import vtkXMLPolyDataReader


class Surface3dVtp(Component):
    def __init__(self):
        super().__init__()

    def javascript_state_changed(self, prev_state, state):
        self.set_python_state(dict(status='running', status_message='Running'))

        vtp_path = state.get('vtp_path', None)
        download_from = state.get('download_from', None)
        vtp_array_name_for_scalars = state.get('vtp_array_name_for_scalars', None)
        vtp_array_component_for_scalars = state.get('vtp_array_component_for_scalars', None)
        if not vtp_path:
            self.set_python_state(dict(status='error', status_message='No vtp_path'))
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

        if vtp_array_name_for_scalars:
            scalars = vtk_to_numpy(X.GetPointData().GetArray(vtp_array_name_for_scalars))
            scalars = scalars[:, vtp_array_component_for_scalars]
        else:
            scalars = None
            
        self.set_python_state(dict(
            status='finished',
            vertices=vertices,
            faces=faces,
            scalars=scalars
        ))
