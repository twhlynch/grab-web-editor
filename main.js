import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/TransformControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@v0.132.0/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/webxr/VRButton.min.js";
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.126/examples/jsm/renderers/CSS2DRenderer.js';

let camera, scene, renderer, light, sun, controls, control, drag, current;
let objects = [];
let loader = new GLTFLoader();

let materialList = [
    'textures/default.png',
    'textures/grabbable.png',
    'textures/ice.png',
    'textures/lava.png',
    'textures/wood.png',
    'textures/grapplable.png',
    'textures/grapplable_lava.png',
    'textures/grabbable_crumbling.png',
    'textures/default_colored.png',
    'textures/bouncing.png'
];
let shapeList = [
    'models/cube.glb',
    'models/sphere.glb',
    'models/cylinder.glb',
    'models/pyramid.glb',
    'models/prism.glb',
    'models/sign.glb',
    'models/start_end.glb'
];

let materials = [];
let shapes = [];

let PROTOBUF_DATA = `
syntax = "proto3";

package COD.Level;

message Level
{
  uint32 formatVersion = 1;

  string title = 2;
  string creators = 3;
  string description = 4;
  uint32 complexity = 5;
  uint32 maxCheckpointCount = 7;

  AmbienceSettings ambienceSettings = 8;

  repeated LevelNode levelNodes = 6;
}

message Vector
{
	float x = 1;
	float y = 2;
	float z = 3;
}

message Quaternion
{
	float x = 1;
	float y = 2;
	float z = 3;
	float w = 4;
}

message Color
{
	float r = 1;
	float g = 2;
	float b = 3;
	float a = 4;
}

message AmbienceSettings
{
	Color skyZenithColor = 1;
	Color skyHorizonColor = 2;

	float sunAltitude = 3;
	float sunAzimuth = 4;
	float sunSize = 5;

	float fogDDensity = 6;
}

enum LevelNodeShape
{
	START = 0;
	FINISH = 1;
	SIGN = 2;

	__END_OF_SPECIAL_PARTS__ = 3;

	CUBE = 1000;
	SPHERE = 1001;
	CYLINDER = 1002;
	PYRAMID = 1003;
	PRISM = 1004;
}

enum LevelNodeMaterial
{
	DEFAULT = 0;
	GRABBABLE = 1;
	ICE = 2;
	LAVA = 3;
	WOOD = 4;
	GRAPPLABLE = 5;
	GRAPPLABLE_LAVA = 6;

	GRABBABLE_CRUMBLING= 7;
	DEFAULT_COLORED = 8;
	BOUNCING = 9;
}

message LevelNodeGroup
{
	Vector position = 1;
	Vector scale = 2;
	Quaternion rotation = 3;

	repeated LevelNode childNodes = 4;
}

message LevelNodeStart
{
	Vector position = 1;
	Quaternion rotation = 2;
	float radius = 3;
}

message LevelNodeFinish
{
	Vector position = 1;
	float radius = 2;
}

message LevelNodeStatic
{
	LevelNodeShape shape = 1;
	LevelNodeMaterial material = 2;

	Vector position = 3;
	Vector scale = 4;
	Quaternion rotation = 5;

	Color color = 6;
	bool isNeon = 7;
}

message LevelNodeCrumbling
{
	LevelNodeShape shape = 1;
	LevelNodeMaterial material = 2;

	Vector position = 3;
	Vector scale = 4;
	Quaternion rotation = 5;

	float stableTime = 6;
	float respawnTime = 7;
}

message LevelNodeSign
{
	Vector position = 1;
	Quaternion rotation = 2;

	string text = 3;
}

message AnimationFrame
{
	float time = 1;
	Vector position = 2;
	Quaternion rotation = 3;
}

message Animation
{
	enum Direction
	{
		RESTART = 0;
		PINGPONG = 1;
	}

	string name = 1;
	repeated AnimationFrame frames = 2;
	Direction direction = 3;
	float speed = 4;
}

message LevelNode
{
	bool isLocked = 6;

	oneof content
	{
		LevelNodeStart levelNodeStart = 1;
		LevelNodeFinish levelNodeFinish = 2;
		LevelNodeStatic levelNodeStatic = 3;
		LevelNodeSign levelNodeSign = 4;
		LevelNodeCrumbling levelNodeCrumbling = 5;
		LevelNodeGroup levelNodeGroup = 7;
	}

	repeated Animation animations = 15;
}
`
const vertexShader = /*glsl*/`

varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform mat3 worldNormalMatrix;

void main()
{
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vNormal = worldNormalMatrix * normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fragmentShader = /*glsl*/`

varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform vec3 colors;
uniform float opacity;
uniform sampler2D colorTexture;
uniform float tileFactor;

const float gamma = 0.5;

void main()
{
    vec4 color = vec4(colors, opacity);
    vec3 blendNormals = abs(vNormal);
    vec3 texSample;
    vec4 adjustment = vec4(1.0, 1.0, 1.0, 1.0);

    if(blendNormals.x > blendNormals.y && blendNormals.x > blendNormals.z)
    {
        texSample = texture2D(colorTexture, vWorldPosition.zy * tileFactor).rgb;
    }
    else if(blendNormals.y > blendNormals.z)
    {
        texSample = texture2D(colorTexture, vWorldPosition.xz * tileFactor).rgb;
    }
    else
    {
        texSample = texture2D(colorTexture, vWorldPosition.xy * tileFactor).rgb;
    }

    texSample = pow(texSample, vec3(1.0 / gamma));

    color.rgb *= texSample * adjustment.rgb;
    gl_FragColor = LinearTosRGB(color);
}`;

function loadTexture(path) {
    return new Promise((resolve) => {
        const texture = new THREE.TextureLoader().load(path, function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            resolve(texture);
        });
    });
}

function loadModel(path) {
    return new Promise((resolve) => {
        loader.load(path, function (gltf) {
            const glftScene = gltf.scene;
            glftScene.children[0].geometry.rotateX(Math.PI);
            resolve(glftScene.children[0]);
        });
    });
}

async function initAttributes() {
    for (const path of materialList) {
        const texture = await loadTexture(path);
        let material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                "colorTexture": { value: texture },
                "tileFactor": { value: 1.1 },
                "worldNormalMatrix": { value: new THREE.Matrix3() },
                "colors": { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                "opacity": { value: 1.0 },
            }
        });
        materials.push(material);
    }

    for (const path of shapeList) {
        const model = await loadModel(path);
        shapes.push(model);
    }
}

function readArrayBuffer(file) {
    return new Promise(function(resolve, reject) {
        let reader = new FileReader();
        reader.onload = function() {
            let data = reader.result;
            let {root} = protobuf.parse(PROTOBUF_DATA, { keepCase: true });
            console.log(root);
            let message = root.lookupType("COD.Level.Level");
            let decoded = message.decode(new Uint8Array(data));
            let object = message.toObject(decoded);
            resolve(object);
        }
        reader.onerror = function() {
            reject(reader);
        }
        reader.readAsArrayBuffer(file);
    });
}

async function openProto(link) {
    let response = await fetch(link);
    let data = await response.arrayBuffer();

    let blob = new Blob([data]);
    let level = await readArrayBuffer(blob);
    
    return level;
}

async function init() {

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth - /*30*/0, window.innerHeight );
    document.getElementById("viewport").appendChild( renderer.domElement );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, (window.innerWidth - /*30*/0) / window.innerHeight, 0.1, 1000 );
    camera.position.z = 5;

    light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
    sun = new THREE.DirectionalLight( 0xffffff, 0.5 );
    scene.add( sun );

    controls = new OrbitControls( camera, renderer.domElement );
    controls.mouseButtons = {LEFT: 2, MIDDLE: 1, RIGHT: 0}
    control = new TransformControls( camera, renderer.domElement );
    control.addEventListener( 'dragging-changed', function ( event ) {
        controls.enabled = ! event.value;
    } );

    drag = new DragControls( objects, camera, renderer.domElement)
    drag.addEventListener( 'dragstart', function ( event ) { 
        controls.enabled = false;
        current = event.object;
        control.attach( event.object );
        scene.add( control );
    } );
    drag.addEventListener( 'dragend', function ( event ) { 
        controls.enabled = true;
    } );

    window.addEventListener( 'resize', onWindowResize );

    window.addEventListener( 'mousedown', handleDown);
    window.addEventListener( 'touchstart', handleDown)
    window.addEventListener( 'mouseup', handleUp);
    window.addEventListener( 'touchend', handleUp);
    window.addEventListener( 'keydown', handleKey);

    let scaleButton = document.getElementById("scale-btn");
    scaleButton.addEventListener( 'click', () => {
        control.setMode( "scale" );
    }
    );
    let rotateButton = document.getElementById("rotate-btn");
    rotateButton.addEventListener( 'click', () => {
        control.setMode( "rotate" );
    }
    );
    let translateButton = document.getElementById("translate-btn");
    translateButton.addEventListener( 'click', () => {
        control.setMode( "translate" );
    }
    );
    let cloneButton = document.getElementById("clone-btn");
    cloneButton.addEventListener( 'click', () => {
        let geometry = current.geometry;
        let material = current.material;

        let obj = new THREE.Mesh( geometry, material );

        obj.scale.x = current.scale.x;
        obj.scale.y = current.scale.y;
        obj.scale.z = current.scale.z;
        obj.rotation.x = current.rotation.x;
        obj.rotation.y = current.rotation.y;
        obj.rotation.z = current.rotation.z;
        obj.position.x = current.position.x;
        obj.position.y = current.position.y;
        obj.position.z = current.position.z;

        scene.add( obj );
        objects.push( obj );
    }
    );
    let deleteButton = document.getElementById("delete-btn");
    deleteButton.addEventListener( 'click', () => {
        scene.remove(current);
        objects.splice(objects.indexOf(current), 1);
        scene.remove(control);
    }
    );

    let vrbutton = VRButton.createButton( renderer );
    let vrcontrol = document.getElementById("vr-btn");
    vrcontrol.addEventListener( 'click', () => {
        renderer.xr.enabled = true;
        renderer.setAnimationLoop( function () {
            renderer.render( scene, camera );
        } );
        vrbutton.click();
    });

    await initAttributes();
    let level = await openProto("https://api.slin.dev/grab/v1/download/29ffxg2ijqxyrgxyy2vjj/1642284195/1");

    let complexity = 0;

    level.levelNodes.forEach(node => {
        complexity += loadLevelNode(node, scene);
    });

    console.log(complexity);
    console.log(objects);
    console.log(scene);

    animate();
}

function loadLevelNode(node, parent) {
    if (node.levelNodeGroup) {
        let cube = new THREE.Object3D()

        objects.push( cube );
        parent.add( cube );

        node.levelNodeGroup.position.x ? cube.position.x = node.levelNodeGroup.position.x : cube.position.x = 0;
        node.levelNodeGroup.position.y ? cube.position.y = node.levelNodeGroup.position.y : cube.position.y = 0;
        node.levelNodeGroup.position.z ? cube.position.z = node.levelNodeGroup.position.z : cube.position.z = 0;
        node.levelNodeGroup.scale.x ? cube.scale.x = node.levelNodeGroup.scale.x : cube.scale.x = 0;
        node.levelNodeGroup.scale.y ? cube.scale.y = node.levelNodeGroup.scale.y : cube.scale.y = 0;
        node.levelNodeGroup.scale.z ? cube.scale.z = node.levelNodeGroup.scale.z : cube.scale.z = 0;
        node.levelNodeGroup.rotation.x ? cube.quaternion.x = node.levelNodeGroup.rotation.x : cube.quaternion.x = 0;
        node.levelNodeGroup.rotation.y ? cube.quaternion.y = node.levelNodeGroup.rotation.y : cube.quaternion.y = 0;
        node.levelNodeGroup.rotation.z ? cube.quaternion.z = node.levelNodeGroup.rotation.z : cube.quaternion.z = 0;
        node.levelNodeGroup.rotation.w ? cube.quaternion.w = node.levelNodeGroup.rotation.w : cube.quaternion.w = 0;

        let groupComplexity = 0;

        node.levelNodeGroup.childNodes.forEach(node => {
            groupComplexity += loadLevelNode(node, cube);
        });

        return groupComplexity;
    } else if (node.levelNodeStatic) { 
        node = node.levelNodeStatic;

        let objectShape, objectMaterial;
        let material = node.material ? node.material : 0;
        let shape = node.shape ? node.shape : 1000;
        
        (shape < 1000 || shape >= shapes.length+1000) ? shape = 1000 : null;
        objectShape = shapes[shape-1000].clone();

        (material < 0 || material >= materials.length) ? material = 0 : null;
        objectMaterial = materials[material].clone();
        
        if (material == 8) {
            let color = [0, 0, 0];
            node.color.r ? color[0] = node.color.r : null;
            node.color.g ? color[1] = node.color.g : null;
            node.color.b ? color[2] = node.color.b : null;
            objectMaterial.uniforms.colors.value = new THREE.Vector3(color[0], color[1], color[2]);
        }

        if ([2, 3, 5, 6].includes(material)) {
            objectMaterial.uniforms.tileFactor.value = 0.5;
        }

        objectShape.material = objectMaterial;

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.rotation.w ? objectShape.quaternion.w = node.rotation.w : objectShape.quaternion.w = 0;
        node.rotation.x ? objectShape.quaternion.x = node.rotation.x : objectShape.quaternion.x = 0;
        node.rotation.y ? objectShape.quaternion.y = node.rotation.y : objectShape.quaternion.y = 0;
        node.rotation.z ? objectShape.quaternion.z = node.rotation.z : objectShape.quaternion.z = 0;
        node.scale.x ? objectShape.scale.x = node.scale.x : objectShape.scale.x = 0;
        node.scale.y ? objectShape.scale.y = node.scale.y : objectShape.scale.y = 0;
        node.scale.z ? objectShape.scale.z = node.scale.z : objectShape.scale.z = 0;

        parent.add(objectShape);
        objects.push(objectShape);

        return 2; // complexity
    } else if (node.levelNodeCrumbling) {
        node = node.levelNodeCrumbling;
        
        let objectShape, objectMaterial;
        let material = node.material ? node.material : 0;
        let shape = node.shape ? node.shape : 1000;
        
        (shape < 1000 || shape >= shapes.length+1000) ? shape = 1000 : null;
        objectShape = shapes[shape-1000].clone();

        (material < 0 || material >= materials.length) ? material = 0 : null;
        objectMaterial = materials[material].clone();
        
        if (material == 8) {
            let color = [0, 0, 0];
            node.color.r ? color[0] = node.color.r : null;
            node.color.g ? color[1] = node.color.g : null;
            node.color.b ? color[2] = node.color.b : null;
            objectMaterial.uniforms.colors.value = new THREE.Vector3(color[0], color[1], color[2]);
        }

        if ([2, 3, 5, 6].includes(material)) {
            objectMaterial.uniforms.tileFactor.value = 0.5;
        }

        objectShape.material = objectMaterial;

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.rotation.w ? objectShape.quaternion.w = node.rotation.w : objectShape.quaternion.w = 0;
        node.rotation.x ? objectShape.quaternion.x = node.rotation.x : objectShape.quaternion.x = 0;
        node.rotation.y ? objectShape.quaternion.y = node.rotation.y : objectShape.quaternion.y = 0;
        node.rotation.z ? objectShape.quaternion.z = node.rotation.z : objectShape.quaternion.z = 0;
        node.scale.x ? objectShape.scale.x = node.scale.x : objectShape.scale.x = 0;
        node.scale.y ? objectShape.scale.y = node.scale.y : objectShape.scale.y = 0;
        node.scale.z ? objectShape.scale.z = node.scale.z : objectShape.scale.z = 0;

        parent.add(objectShape);
        objects.push(objectShape);

        return 3; // complexity
    } else if (node.levelNodeSign) {
        node = node.levelNodeSign;

        let objectShape = shapes[5].clone();
        objectShape.material = materials[4];
        
        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.rotation.w ? objectShape.quaternion.w = node.rotation.w : objectShape.quaternion.w = 0;
        node.rotation.x ? objectShape.quaternion.x = node.rotation.x : objectShape.quaternion.x = 0;
        node.rotation.y ? objectShape.quaternion.y = node.rotation.y : objectShape.quaternion.y = 0;
        node.rotation.z ? objectShape.quaternion.z = node.rotation.z : objectShape.quaternion.z = 0;

        parent.add(objectShape);
        objects.push(objectShape);

        return 5; // complexity
    } else if (node.levelNodeStart) {
        node = node.levelNodeStart;

        let objectShape = shapes[6].clone();
        objectShape.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.rotation.w ? objectShape.quaternion.w = node.rotation.w : objectShape.quaternion.w = 0;
        node.rotation.x ? objectShape.quaternion.x = node.rotation.x : objectShape.quaternion.x = 0;
        node.rotation.y ? objectShape.quaternion.y = node.rotation.y : objectShape.quaternion.y = 0;
        node.rotation.z ? objectShape.quaternion.z = node.rotation.z : objectShape.quaternion.z = 0;
        node.radius ? objectShape.scale.x = node.radius : objectShape.scale.x = 0;
        node.radius ? objectShape.scale.z = node.radius : objectShape.scale.z = 0;

        parent.add(objectShape);
        objects.push(objectShape);

        return 0;
    } else if (node.levelNodeFinish) {
        node = node.levelNodeFinish;

        let objectShape = shapes[6].clone();
        objectShape.material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.radius ? objectShape.scale.x = node.radius : objectShape.scale.x = 0;
        node.radius ? objectShape.scale.z = node.radius : objectShape.scale.z = 0;

        parent.add(objectShape);
        objects.push(objectShape);

        return 0;
    } else {
        return 0;
    }
}

function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
}

function handleDown(e) {
    if (e.button == 1) {
        drag.enabled = false;
    }
}
function handleUp(e) {
    if (e.button == 1) {
        drag.enabled = true;
    }
}

function handleKey(e) {
    console.log(e.which);
    if (e.which == 68) { // d
        let geometry = current.geometry;
        let material = current.material;

        let obj = new THREE.Mesh( geometry, material );

        obj.scale.x = current.scale.x;
        obj.scale.y = current.scale.y;
        obj.scale.z = current.scale.z;
        obj.rotation.x = current.rotation.x;
        obj.rotation.y = current.rotation.y;
        obj.rotation.z = current.rotation.z;
        obj.position.x = current.position.x;
        obj.position.y = current.position.y;
        obj.position.z = current.position.z;

        scene.add( obj );
        objects.push( obj );
    } else if (e.which == 84) { // t
        control.setMode( "translate" );
    } else if (e.which == 82) { // r
        control.setMode( "rotate" );
    } else if (e.which == 83) { // s
        control.setMode( "scale" );
    } else if (e.which == 46) { // delete
        scene.remove(current);
        objects.splice(objects.indexOf(current), 1);
        scene.remove(control);
    }
}

init();

function onWindowResize() {
    camera.aspect = (window.innerWidth - /*30*/0) / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth - /*30*/0, window.innerHeight );
}