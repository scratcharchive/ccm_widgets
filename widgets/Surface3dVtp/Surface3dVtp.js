import React, { Component } from 'react';
import { PythonInterface } from 'reactopya';
import Surface3d from '../Surface3d/Surface3d';
const config = require('./Surface3dVtp.json');

export default class Surface3dVtp extends Component {
    static title = 'Surface3dVtp'
    static reactopyaConfig = config
    constructor(props) {
        super(props);
        this.state = {
            // to python:
            vtp_path: this.props.vtp_path || '',
            download_from: this.props.download_from,
            vtp_array_name_for_scalars: this.props.vtp_array_name_for_scalars,
            vtp_array_component_for_scalars: this.props.vtp_array_component_for_scalars,

            // from python:
            status: '',
            status_message: '',
            vertices: null,
            faces: null,
            scalars: null
        }
    }
    componentDidMount() {
        this.pythonInterface = new PythonInterface(this, config);
        this.pythonInterface.start();
    }
    componentDidUpdate(prevProps, prevState) {
        this.pythonInterface.update();
    }
    componentWillUnmount() {
        this.pythonInterface.stop();
    }
    render() {
        return (
            <RespectStatus {...this.state}>
                <Surface3d {...this.props} vertices={this.state.vertices} faces={this.state.faces} scalars={this.state.scalars} />
            </RespectStatus>
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
