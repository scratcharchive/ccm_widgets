#!/usr/bin/env python

import ccm_widgets as cw
cw.init_electron()


def main():
    props = {
        "vtp_path": "sha1://22f242215ed2625db02b3a1f9d89364defa013f6/quas3.vtp",
        "download_from": "spikeforest.public",
        "scalar_info": {
            "name": "value",
            "component": 0
        },
        "vector_field_info": {
            "name": "value",
            "components": [
                    0,
                    1,
                    2
            ]
        },
        "preset_color_map_name": "erdc_rainbow_bright",
        "arrow_subsample_factor": 250,
        "arrow_width": 0.3,
        "arrow_length_factor": 0.3
    }
    W = cw.Surface3dVtp(**props)
    W.show()


if __name__ == '__main__':
    main()
