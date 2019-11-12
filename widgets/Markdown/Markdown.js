import React, { Component } from 'react';
import { PythonInterface } from 'reactopya';
import ReactMarkdown from 'react-markdown';
const config = require('./Markdown.json');

export default class Markdown extends Component {
    static title = 'Show markdown content, possibly from a local or remote file'
    static reactopyaConfig = config
    constructor(props) {
        super(props);
        this.state = {
            // javascript state
            path: '',
            
            // python state
            content: '',
            status: '',
            status_message: ''
        }
    }
    componentDidMount() {
        if ((this.props.path) && (this.props.content)) {
            throw new Error('Cannot provide both path and content.');
        }
        if (this.props.path) {
            this.pythonInterface = new PythonInterface(this, config);
            this.pythonInterface.start();
            this.pythonInterface.setState({
                path: this.props.path
            });
        }
        else if (this.props.content) {
            this.setState({
                content: this.props.content,
                status: 'finished'
            });
        }
        else {
            console.error('Missing prop: path or content');
        }
    }
    componentWillUnmount() {
        if (this.pythonInterface) {
            this.pythonInterface.stop();
        }
    }
    render() {
        return (
            <RespectStatus {...this.state}>
                <ReactMarkdown
                    source={this.state.content}
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