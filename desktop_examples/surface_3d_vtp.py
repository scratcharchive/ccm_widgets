#!/usr/bin/env python

import ccm_widgets as cw
cw.init_electron()

def main():
    W = cw.Surface3dVtp(
        vtp_path="sha1://22f242215ed2625db02b3a1f9d89364defa013f6/quas3.vtp",
        download_from="spikeforest.public",
        vtp_array_name_for_scalars="value",
        vtp_array_component_for_scalars=5,
        preset_color_map_name="erdc_rainbow_bright"
    )
    W.show()

if __name__ == '__main__':
    main()
