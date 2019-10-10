import React, { Component } from 'react';
import CanvasWidget, { CanvasWidgetLayer, PainterPath } from '../jscommon/CanvasWidget';
import { PythonInterface } from 'reactopya';
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
                    evalFunc={this._evalFunc}
                    theta_range={this.props.theta_range}
                    data_range={((this.props.data_range == 'auto') || (!this.props.data_range)) ? this.state.data_range_computed : this.props.data_range}
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
    return [minval, maxval];
}

class SectorPlotBase extends Component {
    constructor(props) {
        super(props);
        this.state = {};
        this._mainLayer = new CanvasWidgetLayer(this._paintMainLayer);
        this._allLayers = [
            this._mainLayer
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
        painter.clear();
        this._mainLayer.setCoordXRange(0, 1.3);
        this._mainLayer.setCoordYRange(-1, 1);
        this._mainLayer.setPreserveAspectRatio(true);
        painter.useCoords();
        // painter.fillRect(-1, -1, 2, 2, {color: 'lightgray'});
        painter.usePixels();
        for (let y = 0; y < this._mainLayer.height(); y++) {
            for (let x = 0; x < this._mainLayer.width(); x++) {
                let coords = this._mainLayer.pixToCoords([x, y]);
                let col = this._getColor(coords[0], coords[1]);
                if (col) {
                    painter.fillRect(x, y, 1, 1, {color: col});
                }
            }
        }
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

        for (let i=0; i<100; i++) {
            let frac = i/100;
            let R = [1.1, -0.5 + frac * 1, 0.1, 1/100];
            let col = this._colorForVal(data_range[0] + frac * (data_range[1] - data_range[0]));
            painter.setPen({color: col});
            painter.drawRect(R);
            painter.fillRect(R, col)
        }
        painter.setPen({color: 'gray', width: this.props.border_with || 2});
        painter.drawRect(1.1, -0.5, 0.1, 1);

        console.log('elapsed for rendering: ', (new Date()) - timer);
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
        return `rgb(${val*255}, ${val*255}, ${val*255})`;
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