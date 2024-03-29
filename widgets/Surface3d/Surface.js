import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';
import vtkArrowSource from 'vtk.js/Sources/Filters/Sources/ArrowSource';
import { mat4, quat } from 'gl-matrix';
window.mat4 = mat4;
window.quat = quat;

import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import {
    ColorMode,
    ScalarMode,
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';

export default class Surface {
    constructor(vertices, faces, scalars, arrows, opts) {
        this.prevContainer = null;

        let arrow_length_factor = opts.arrowLengthFactor;
        let arrow_width = opts.arrowWidth;

        const renderWindow = vtkRenderWindow.newInstance();
        const renderer = vtkRenderer.newInstance({ background: [0.2, 0.3, 0.4] });
        renderWindow.addRenderer(renderer);

        {
            // ----------------------------------------------------------------------------
            // reader --> source --> mapper --> actor --> renderer -> render window
            // ----------------------------------------------------------------------------

            let points_values = [];
            for (let i=0; i<vertices.length; i++) {
                for (let j=0; j<3; j++) {
                    points_values.push(vertices[i][j]);
                }
            }

            // The following is very helpful: https://kitware.github.io/vtk-js/docs/structures_PolyData.html
            let poly_init = {
                points: {
                    vtkClass: 'vtkPoints',
                    numberOfComponents: 3,
                    size: vertices.length,
                    dataType: 'Float32Array',
                    values: Float32Array.from(points_values)
                },
                polys: {
                    vtkClass: 'vtkCellArray',
                    dataType: 'Uint32Array',
                    values: Uint32Array.from(faces)
                }
            }
            if (scalars) {
                poly_init.pointData = {
                    vtkClass: "vtkDataSetAttributes",
                    arrays: [
                        {
                            data: {
                                vtkClass: "vtkDataArray",
                                name: "scalars",
                                numberOfComponents: 1,
                                size: vertices.length,
                                values: Float32Array.from(scalars)
                            }
                        }
                    ]
                }
            }
            const polyData = new vtkPolyData.newInstance(poly_init);
            
            const source = polyData;

            const lookupTable = vtkColorTransferFunction.newInstance();
            const preset = vtkColorMaps.getPresetByName(opts.presetColorMapName || 'erdc_rainbow_bright');
            lookupTable.applyColorMap(preset);
            let vectorComponent = ('vectorComponent' in opts) ? opts.vectorComponent : -1;
            if (vectorComponent >= 0) {
                lookupTable.setVectorModeToComponent();
                lookupTable.setVectorComponent(vectorComponent);
            }
            else {
                lookupTable.setVectorModeToMagnitude();
            }
            window.debug_source = source;
            const mapper = vtkMapper.newInstance({
                scalarVisibility: (scalars ? true : false),  // whether scalar data is used to color objects
                interpolateScalarsBeforeMapping: true, // not sure I understand this
                useLookupTableScalarRange: true, // whether the mapper sets the lookuptable range based on its own ScalarRange,
                lookupTable, // used to map scalars into colors
                colorByArrayName: (scalars ? 'scalars' : undefined), // the array name to do the coloring -- I think it's source.getPointData().getArray(colorByArrayName)
                colorMode: ColorMode.MAP_SCALARS, // not sure I understand this. Affects how scalars are sent to the lookup table
                scalarMode: ScalarMode.USE_POINT_FIELD_DATA // whether to use point data, cell data, or other
            });
            

            mapper.setInputData(source);
            const actor = vtkActor.newInstance();
            actor.setMapper(mapper);

            if (scalars) {
                const dataRange = source.getPointData().getArray('scalars').getRange(0);
                lookupTable.setMappingRange(dataRange[0], dataRange[1]);
                lookupTable.updateRange();
            }

            renderer.addActor(actor);
        }


        if (arrows) {
            for (let i=0; i<arrows.length; i++) {
                let arrow = arrows[i];
                let v = arrow.start;
                let w = [
                    arrow.end[0] - arrow.start[2],
                    arrow.end[1] - arrow.start[1],
                    arrow.end[2] - arrow.start[2]
                ];
                const magnitude = Math.sqrt(w[0]*w[0]+w[1]*w[1]+w[2]*w[2]);
                w[0] /= magnitude;
                w[1] /= magnitude;
                w[2] /= magnitude;

                const arrowSource = vtkArrowSource.newInstance({
                    direction: [1, 0, 0],
                    tipResolution: 8,
                    tipRadius: 0.2,
                    tipLength: 0.3,
                    shaftResolution: 8,
                    shaftRadius: 0.05
                });
                const actor = vtkActor.newInstance();
                const mapper = vtkMapper.newInstance();

                actor.setMapper(mapper);
                actor.getProperty().setEdgeVisibility(false);
                actor.getProperty().setEdgeColor(1, 0, 0);
                actor.getProperty().setRepresentationToSurface();
                // mapper.setInputConnection(arrowSource.getOutputPort());

                let data0 = arrowSource.getOutputData(0);
                    // .rotateFromDirections([0, a, 0], [1, 0, 0]);
                // vtkMatrixBuilder
                //     .buildFromDegree()
                //     .translate([0, 0, a])
                //     .apply(data0.getPoints().getData());

                mapper.setInputData(data0);
                // actor.setPosition([0, 0, a]);
                

                let matrix = mat4.create();
                mat4.translate(matrix, matrix, v);
                const rot = get_rotation_between([1, 0, 0], w);
                mat4.mul(matrix, matrix, rot);
                
                // mat4.scale(matrix, matrix, [magnitude, magnitude, magnitude]);
                mat4.scale(matrix, matrix, [magnitude * arrow_length_factor, arrow_width, arrow_width]);

                mat4.translate(matrix, matrix, [0.35, 0, 0])
                
                actor.setUserMatrix(matrix);
                renderer.addActor(actor);
                window.arrow_actor = actor;

                function get_rotation_between(a, b) {
                    let cp = [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
                    let dp = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
                    let theta = Math.acos(dp);
                    let X = mat4.create();
                    mat4.rotate(X, X, theta, cp);
                    return X;
                }
            }
        }
        
        renderer.resetCamera();

        const openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
        renderWindow.addView(openglRenderWindow);

        this.openglRenderWindow = openglRenderWindow;

        // ----------------------------------------------------------------------------
        // Setup an interactor to handle mouse events
        // ----------------------------------------------------------------------------

        const interactor = vtkRenderWindowInteractor.newInstance();
        interactor.setView(this.openglRenderWindow);
        interactor.initialize();

        // ----------------------------------------------------------------------------
        // Setup interactor style to use
        // ----------------------------------------------------------------------------

        interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());

        this.interactor = interactor;
    }
    setContainer(container) {
        if (container != this.prevContainer) {
            this.interactor.bindEvents(container);
            this.openglRenderWindow.setContainer(container);
            this.prevContainer = container;
        }

        // ----------------------------------------------------------------------------
        // Capture size of the container and set it to the renderWindow
        // ----------------------------------------------------------------------------

        const { width, height } = container.getBoundingClientRect();
        this.openglRenderWindow.setSize(width, height);
        this.interactor.setView(this.openglRenderWindow);
        this.interactor.initialize();
    }
}