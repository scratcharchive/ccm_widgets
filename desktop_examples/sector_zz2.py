#!/usr/bin/env python

import ccm_widgets as cw
import numpy as np
from matplotlib import cm
cw.init_electron()

y = cm.viridis(range(256))
print(y)
X = cw.SectorPlot(
    data_samples_path="sha1://6455e1df7a470594c19dc1a4bedd2186f8b76a5f/test_for_jfm_zz2.npy",
    download_from="spikeforest.public",
    theta_range=[-np.pi/6, np.pi/6],
    data_range="auto",
    colorbarticks=[-12, -8, -4],
    colorbarticklabels=[],
    colormap=y.T,
    rticks=[0.3, 0.6, 0.8],
    rticklabels=["test1", "10^-3", "10^-test"],
    thetaticks=[-0.52, 0.52],
    thetaticklabels=["\\\\pi/6", "\\\\pi/6"],
    fontSize=18
)
X.show()
