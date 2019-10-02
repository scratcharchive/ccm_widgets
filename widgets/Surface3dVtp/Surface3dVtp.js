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
            // javascript state:
            vtp_path: null,
            download_from: null,
            scalar_info: null,
            vector_field_info: null,
            arrow_subsample_factor: null,

            // python state:
            status: '',
            status_message: '',
            vertices: null,
            faces: null,
            scalars: null,
            arrows: null
        }
    }
    componentDidMount() {
        this.pythonInterface = new PythonInterface(this, config);
        this.pythonInterface.setState({
            vtp_path: this.props.vtp_path || '',
            download_from: this.props.download_from,
            scalar_info: this.props.scalar_info,
            vector_field_info: this.props.vector_field_info,
            arrow_subsample_factor: this.props.arrow_subsample_factor
        });
        this.pythonInterface.start();
    }
    componentWillUnmount() {
        this.pythonInterface.stop();
    }
    render() {
        return (
            <RespectStatus {...this.state}>
                <Surface3d
                    {...this.props}
                    vertices={this.state.vertices}
                    faces={this.state.faces}
                    scalars={this.state.scalars}
                    arrows={this.state.arrows}
                />
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
