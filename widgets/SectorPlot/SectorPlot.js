import React, { Component } from 'react';
import CanvasWidget, { CanvasWidgetLayer, PainterPath } from '../jscommon/CanvasWidget';
import { PythonInterface } from 'reactopya';
import { type } from 'os';
const config = require('./SectorPlot.json');

export default class SectorPlot extends Component {
    static title = 'Sector plot'
    static reactopyaConfig = config
    constructor(props) {
        super(props);
        this.state = {
            // javascript state
            data_samples_path: null, // path to .npy file
            download_from: null,
            
            // python state (or directly from props)
            data_samples: null, // [[a11, a12, a13, ...], [a21, a22, a23, ...], ... ] inner dimension is radius
            status: '',
            status_message: '',

            // other
            data_range_computed: null  // [a, b] to be used if data_range is 'auto'
        }
    }
    componentDidMount() {
        if (this.props.data_samples) {
            this.setState({
                data_samples: this.props.data_samples,
                status: 'finished'
            });
        }
        else if (this.props.data_samples_path) {
            this.pythonInterface = new PythonInterface(this, config);
            this.pythonInterface.start();
            this.pythonInterface.setState({
                data_samples_path: this.props.data_samples_path,
                download_from: this.props.download_from || null
            });
        }
        else {
            console.error('Missing props: data_samples or data_samples_path');
        }
    }
    componentDidUpdate() {
        if (this.state.status == 'finished') {
            if ((this.state.data_samples) && (!this.state.data_range_computed)) {
                this.setState({
                    data_range_computed: computeDataRange(this.state.data_samples)
                });
            }
        }
    }
    componentWillUnmount() {
        this.pythonInterface.stop();
    }
    _evalFunc = (r, t) => {
        const theta1 = this.props.theta_range[0];
        const theta2 = this.props.theta_range[1];
        const data_samples = this.state.data_samples;
        const rFrac = r;
        const tFrac = (t - theta1) / (theta2 - theta1);
        const rInd = Math.floor(data_samples[0].length * rFrac);
        const tInd = Math.floor(data_samples.length * tFrac);
        if ((0 <= rInd) && (rInd < data_samples[0].length) && (0 <= tInd) && (tInd < data_samples.length)) {
            return data_samples[tInd][rInd];
        }
        else {
            return NaN;
        }
    }
    render() {
        return (
            <RespectStatus {...this.state}>
                <SectorPlotBase
                    width={this.props.width}
                    height={this.props.height}
                    rticks={this.props.rticks || []}
                    rticklabels={this.props.rticklabels}
                    thetaticks={this.props.thetaticks || []}
                    thetaticklabels={this.props.thetaticklabels}
                    colorbarticks={this.props.colorbarticks || []}
                    colorbarticklabels={this.props.colorbarticklabels}
                    colormap={this.props.colormap || 'gray'}
                    fontSize={this.props.fontSize}
                    evalFunc={this._evalFunc}
                    theta_range={this.props.theta_range}
                    data_range={((this.props.data_range == 'auto') || (!this.props.data_range)) ? this.state.data_range_computed : this.props.data_range}
//                    data_range ={this.props.data_range}
                    border_width={this.props.border_width}
                />
            </RespectStatus>
        )
    }
}

function computeDataRange(X) {
    let minval = NaN;
    let maxval = NaN;
    for (let a of X) {
        for (let val of a) {
            if ((isNaN(minval)) || (val < minval)) minval = val;
            if ((isNaN(maxval)) || (val > maxval)) maxval = val;
        }
    }
    // minval = -16
    // maxval = 0
    return [minval, maxval];
}

class SectorPlotBase extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        this._mainLayer = new CanvasWidgetLayer(this._paintMainLayer);
        // this._rAxisLayer = new CanvasWidgetLayer(this._paintRAxisLayer);
        this._allLayers = [
            this._mainLayer //,
            //this._rAxisLayer
        ];
    }
    componentDidMount() {
    }
    componentDidUpdate() {
    }
    componentWillUnmount() {
    }
    _paintMainLayer = (painter) => {
        const data_range = this.props.data_range;
        if (!data_range) return;

        let timer = new Date();
        this._mainLayer.setCoordXRange(0, 1.3);
        this._mainLayer.setCoordYRange(-1, 1);
        this._mainLayer.setPreserveAspectRatio(true);
        painter.useCoords();
        // painter.fillRect(-1, -1, 2, 2, {color: 'lightgray'});
        painter.usePixels();

        const W = this._mainLayer.width();
        const H = this._mainLayer.height();
        let temporaryCanvas = document.createElement("canvas");
        temporaryCanvas.width = W;
        temporaryCanvas.height = H;

        // let temporaryCanvas = new temporaryCanvas(W, H);
        var temporaryCtx = temporaryCanvas.getContext('2d');

        let imagedata = temporaryCtx.createImageData(this._mainLayer.width(), this._mainLayer.height());
        for (let y = 0; y < this._mainLayer.height(); y++) {
            for (let x = 0; x < this._mainLayer.width(); x++) {
                var pixelindex = (y * this._mainLayer.width() + x) * 4;
                let coords = this._mainLayer.pixToCoords([x, y]);
                let col = this._getColor(coords[0], coords[1]);
                if (col) {
                    imagedata.data[pixelindex + 0] = Math.floor(col[0]);
                    imagedata.data[pixelindex + 1] = Math.floor(col[1]);
                    imagedata.data[pixelindex + 2] = Math.floor(col[2]);
                    imagedata.data[pixelindex + 3] = 255;
                    // painter.fillRect(x, y, 1.1, 1.1, {color: col});
                }
                else {
                    imagedata.data[pixelindex + 0] = 0;
                    imagedata.data[pixelindex + 1] = 0;
                    imagedata.data[pixelindex + 2] = 0;
                    imagedata.data[pixelindex + 3] = 0;
                }
            }
        }
        temporaryCtx.putImageData(imagedata, 0, 0);

        // We need to go through hoops to allow canvas2svg to work properly
        // canvas2svg implements drawImage, but not putImageData
        // Also, offscreen canvas does not work (FYI)
        painter.drawImage(temporaryCanvas, 0, 0);

        // In the future we could use the follow to compress the image -- but we prob don't need to worry about that
        // let dataUrl = temporaryCtx.canvas.toDataURL('image/png');

        painter.useCoords();
        painter.setPen({color: 'gray', width: this.props.border_width || 2});
        let theta1 = this.props.theta_range[0];
        let theta2 = this.props.theta_range[1];
        painter.drawLine(0, 0, Math.cos(theta1), Math.sin(theta1));
        painter.drawLine(0, 0, Math.cos(theta2), Math.sin(theta2));
        let path = new PainterPath();
        for (let t = theta1; t<=theta2; t+=Math.PI/180) {
            path.lineTo(Math.cos(t), Math.sin(t));
        }
        path.lineTo(Math.cos(theta2), Math.sin(theta2));
        painter.drawPath(path);

        // painter.setPen({color: 'yellow'});
        // painter.setBrush({color: 'green'});
        // painter.usePixels();
        // painter.ctxSave();
        // painter.ctxTranslate(painter.coordsToPix(0, 0));
        // painter.ctxRotate(-theta1);
        // painter.drawText([-30, 0, 60, 30], {AlignTop: true, AlignCenter: true}, 'test');
        // painter.ctxRestore();
        
        console.log('elapsed for rendering: ', (new Date()) - timer);

        this._paintRAxisLayer(painter);
        this._paintThetaAxisLayer(painter);
        this._paintColorBar(painter);
    }
    _paintRAxisLayer = (painter) => {
        const { rticks, rticklabels } = this.props;

        let theta1 = this.props.theta_range[0];
        let theta2 = this.props.theta_range[1];

        this._mainLayer.setCoordXRange(0, 1.3);
        this._mainLayer.setCoordYRange(-1, 1);
        this._mainLayer.setPreserveAspectRatio(true);

        const fontSize = this.props.fontSize || 12;
        const subscriptPixelWidthPerCharacter = fontSize / 1.7;
        painter.setFont({"pixel-size": fontSize, "family": "Courier"});

        const normalDirection = [Math.sin(theta1), -Math.cos(theta1)];


        for (let i=0; i<rticks.length; i++) {
            let rtick = rticks[i];
            let rticklabel = rticklabels[i] !== undefined ? rticklabels[i] : rtick + '';
            painter.setPen({color: 'black'});
            painter.setBrush({color: 'black'});
            painter.usePixels();
            painter.ctxSave();
            painter.ctxTranslate(painter.coordsToPix(rtick * Math.cos(theta1), rtick * Math.sin(theta1)));
            // painter.ctxRotate(-theta1);
            let txtList = rticklabel.split('^');
            
            const horizontalOffset = normalDirection[0] * 8;
            const verticalOffset = normalDirection[1] * 8 * (-1);
            if (txtList.length === 1) {
                painter.drawText([-100 + horizontalOffset, 0 + verticalOffset, 100, 100], {AlignTop: true, AlignRight: true}, rticklabel);
            }
            else if (txtList.length === 2) {
                const subscriptElevation = 5;
                const subscriptTextWidth = txtList[1].length * subscriptPixelWidthPerCharacter;
                painter.drawText([-100 + horizontalOffset, 0 - subscriptElevation + verticalOffset, 100, 100], {AlignTop: true, AlignRight: true}, txtList[1]);
                painter.drawText([-100 + horizontalOffset - subscriptTextWidth, 0 + verticalOffset, 100, 100], {AlignTop: true, AlignRight: true}, txtList[0]);
            }
            painter.drawLine(0, 0, horizontalOffset / 2, verticalOffset / 2);
            painter.ctxRestore();
            // painter.drawText([0, 0, 100, 100], {AlignTop: true, AlignCenter: true}, 'testing');
        }
    }
    _paintThetaAxisLayer = (painter) => {
        const { thetaticks, thetaticklabels } = this.props;

        let theta1 = this.props.theta_range[0];
        let theta2 = this.props.theta_range[1];

        this._mainLayer.setCoordXRange(0, 1.3);
        this._mainLayer.setCoordYRange(-1, 1);
        this._mainLayer.setPreserveAspectRatio(true);

        const fontSize = this.props.fontSize || 12;
        const subscriptPixelWidthPerCharacter = fontSize / 1.7;
        painter.setFont({"pixel-size": fontSize, "family": "Courier"});


        for (let i=0; i<thetaticks.length; i++) {
            let thetatick = thetaticks[i];
            let thetaticklabel = thetaticklabels[i] !== undefined ? thetaticklabels[i] : thetatick + '';
            const normalDirection = [1 * Math.cos(thetatick), 1 * Math.sin(thetatick)];
            thetaticklabel = thetaticklabel.replace('\\pi', String.fromCharCode(960));
            painter.setPen({color: 'black'});
            painter.setBrush({color: 'black'});
            painter.usePixels();
            painter.ctxSave();
            painter.ctxTranslate(painter.coordsToPix(1 * Math.cos(thetatick), 1 * Math.sin(thetatick)));
            // painter.ctxRotate(-theta1);
            let txtList = thetaticklabel.split('^');
            
            const horizontalOffset = normalDirection[0] * 8;
            const verticalOffset = normalDirection[1] * 8 * (-1);
            if (txtList.length === 1) {
                painter.drawText([0 + horizontalOffset, -50 + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, thetaticklabel);
            }
            else if (txtList.length === 2) {
                const subscriptElevation = 5;
                const subscriptTextWidth = txtList[1].length * subscriptPixelWidthPerCharacter;
                painter.drawText([0 + horizontalOffset, -50 - subscriptElevation + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, txtList[1]);
                painter.drawText([0 + horizontalOffset - subscriptTextWidth, -50 + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, txtList[0]);
            }
            painter.drawLine(0, 0, horizontalOffset / 2, verticalOffset / 2);
            painter.ctxRestore();
            // painter.drawText([0, 0, 100, 100], {AlignTop: true, AlignCenter: true}, 'testing');
        }
    }
    _paintColorBar = (painter) => {
        const data_range = this.props.data_range;
        if (!data_range) return;

        const { colorbarticks, colorbarticklabels } = this.props;

        let timer = new Date();
        this._mainLayer.setCoordXRange(0, 1.3);
        this._mainLayer.setCoordYRange(-1, 1);
        this._mainLayer.setPreserveAspectRatio(true);
        painter.useCoords();

        const fontSize = this.props.fontSize || 12;
        const subscriptPixelWidthPerCharacter = fontSize / 1.7;
        painter.setFont({"pixel-size": fontSize, "family": "Courier"});
        for (let i=0; i<100; i++) {
            let frac = i/100;
            let R = [1.2, -0.5 + frac * 1, 0.1, 1/100];
            let col = this._colorForVal(data_range[0] + frac * (data_range[1] - data_range[0]));
            painter.setPen({color: col});
            painter.drawRect(R);
            painter.fillRect(R, col)
        }
        painter.setPen({color: 'gray', width: this.props.border_with || 2});
        painter.drawRect(1.2, -0.5, 0.1, 1);

        for (let i=0; i<colorbarticks.length; i++) {
            let tick = colorbarticks[i];
            let ticklabel = colorbarticklabels[i] !== undefined ? colorbarticklabels[i] : tick + '';
            const normalDirection = [1, 0];
            ticklabel = ticklabel.replace('\\pi', String.fromCharCode(960));
            painter.setPen({color: 'black'});
            painter.setBrush({color: 'black'});
            painter.usePixels();
            painter.ctxSave();
            const frac = (tick - data_range[0]) / (data_range[1] - data_range[0]);
            painter.ctxTranslate(painter.coordsToPix(1.2 + 0.1, -0.5 + frac * 1));
            // painter.ctxRotate(-theta1);
            let txtList = ticklabel.split('^');
            
            const horizontalOffset = normalDirection[0] * 8;
            const verticalOffset = normalDirection[1] * 8 * (-1);
            if (txtList.length === 1) {
                painter.drawText([0 + horizontalOffset, -50 + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, ticklabel);
            }
            else if (txtList.length === 2) {
                const subscriptElevation = 5;
                const subscriptTextWidth = txtList[0].length * subscriptPixelWidthPerCharacter;
                painter.drawText([0 + horizontalOffset + subscriptTextWidth, -50 - subscriptElevation + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, txtList[1]);
                painter.drawText([0 + horizontalOffset, -50 + verticalOffset, 100, 100], {AlignVCenter: true, AlignLeft: true}, txtList[0]);
            }
            painter.drawLine(0, 0, horizontalOffset / 2, verticalOffset / 2);
            painter.ctxRestore();
        }
    }
    _getColor(x, y) {
        const theta1 = this.props.theta_range[0];
        const theta2 = this.props.theta_range[1];
        const theta = Math.atan2(y, x);
        const r = Math.sqrt(x*x + y*y);
        const data_range = this.props.data_range;
        if (!data_range) return undefined;
        if ((theta1 <= theta) && (theta <= theta2) && (r<=1)) {
            let val = Number(this.props.evalFunc(r, theta));
            if (!isNaN(val)) {
                return this._colorForVal(val);
            }
            else {
                return undefined;
            }
        }
        else {
            return undefined;
        }
    }
    _colorForVal(val) {
        val = (val - this.props.data_range[0]) / (this.props.data_range[1] - this.props.data_range[0]);
        val = Math.max(val,0);
        val = Math.min(val,1);
        const cmap = this.props.colormap;
        
        if (cmap === 'gray')
        {
            return [val*255, val*255, val*255];
            // return `rgb(${val*255}, ${val*255}, ${val*255})`;
        }
        else
        {
           const dim = [cmap.length,cmap[0].length];
           let nbin = Math.floor(val * (dim[0]-1));
           nbin = Math.min(dim[0]-2,nbin);
           let vtmp = (val - nbin/(dim[0]-1))*(dim[0]-1);
           let rval = cmap[nbin][0] + vtmp*(cmap[nbin+1][0]-cmap[nbin][0]);
           let gval = cmap[nbin][1] + vtmp*(cmap[nbin+1][1]-cmap[nbin][1]);
           let bval = cmap[nbin][2] + vtmp*(cmap[nbin+1][2]-cmap[nbin][2]);
           return [rval*255, gval*255, bval*255];
           // return `rgb(${rval*255}, ${gval*255}, ${bval*255})`;
        }
    }
    _updateLayers() {
    }
    render() {
        let width = this.props.width || 400;
        let height = this.props.height || 400;
        return (
            <CanvasWidget
                layers={this._allLayers}
                width={width}
                height={height}
                menuOpts={{exportSvg: true}}
            />
        )
    }
}

class RespectStatus extends Component {
    state = {}
    render() {
        switch (this.props.status) {
            case 'running':
                return <div>Running: {this.props.status_message}</div>
            case 'error':
                return <div>Error: {this.props.status_message}</div>
            case 'finished':
                return this.props.children;
            default:
                return <div>Unknown status: {this.props.status}</div>
        }
    }
}
