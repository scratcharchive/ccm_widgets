#!/usr/bin/env python

import ccm_widgets as cw
import numpy as np
cw.init_electron()

X = cw.SectorPlot(
    data_samples=np.array([[0, 1, 2, 3], [0, 2, 4, 6], [0, 3, 6, 9], [0, 4, 8, 12]]).T,
    theta_range=[-np.pi/6, np.pi/6],
    data_range="auto"
)
X.show()