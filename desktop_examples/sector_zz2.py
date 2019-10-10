#!/usr/bin/env python

import ccm_widgets as cw
import numpy as np
cw.init_electron()

X = cw.SectorPlot(
    data_samples_path="sha1://6455e1df7a470594c19dc1a4bedd2186f8b76a5f/test_for_jfm_zz2.npy",
    download_from="spikeforest.public",
    theta_range=[-np.pi/6, np.pi/6],
    data_range="auto"
)
X.show()