import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@v0.132.0/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/webxr/VRButton.min.js";

let camera, scene, renderer, light, sun, controls, control, drag, current;
let objects = [];
let loader = new GLTFLoader();
let importedLevel;
let shadowMapSize, shadowRenderTarget, shadowMap, shadowCamera;

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

let startMaterial, finishMaterial;
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
const startFinishVS = /*glsl*/`
varying vec2 vTexcoord;

void main()
{
    vTexcoord = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const startFinishFS = /*glsl*/`
varying vec2 vTexcoord;

uniform vec4 diffuseColor;

void main()
{
    vec4 color = diffuseColor;
    float factor = vTexcoord.y;
    factor *= factor * factor;
    factor = clamp(factor, 0.0, 1.0);
    color.a = factor;

    gl_FragColor = color;
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

    startMaterial = new THREE.ShaderMaterial();
	startMaterial.vertexShader = startFinishVS;
	startMaterial.fragmentShader = startFinishFS;
	startMaterial.flatShading = true;
	startMaterial.transparent = true;
	startMaterial.depthWrite = false;
	startMaterial.uniforms = { "diffuseColor": {value: [0.0, 1.0, 0.0, 1.0]}};

	finishMaterial = new THREE.ShaderMaterial();
	finishMaterial.vertexShader = startFinishVS;
	finishMaterial.fragmentShader = startFinishFS;
	finishMaterial.flatShading = true;
	finishMaterial.transparent = true;
	finishMaterial.depthWrite = false;
	finishMaterial.uniforms = { "diffuseColor": {value: [1.0, 0.0, 0.0, 1.0]}};
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

    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById("viewport").appendChild( renderer.domElement );
    renderer.setPixelRatio(window.devicePixelRatio);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 5000 );
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
    let rotateButton = document.getElementById("rotate-btn");
    let translateButton = document.getElementById("translate-btn");
    let cloneButton = document.getElementById("clone-btn");
    let deleteButton = document.getElementById("delete-btn");
    let exportButton = document.getElementById("export-btn");
    
    scaleButton.addEventListener( 'click', () => {control.setMode( "scale" );});
    rotateButton.addEventListener( 'click', () => {control.setMode( "rotate" );});
    translateButton.addEventListener( 'click', () => {control.setMode( "translate" );});
    cloneButton.addEventListener( 'click', cloneCurrent);
    deleteButton.addEventListener( 'click', deleteCurrent);
    exportButton.addEventListener( 'click', exportScene);

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

    let url = "https://api.slin.dev/grab/v1/download/29ffxg2ijqxyrgxyy2vjj/1642284195/1"
    let query = new URLSearchParams(window.location.search);
    if (query.has("level")) {
        let id = query.get("level");
        if (id.split(":").length == 3) {
            url = `https://api.slin.dev/grab/v1/download/${id.split(":").join("/")}`;
        } else {
            let detailsUrl = "https://api.slin.dev/grab/v1/details/" + id.split(":").join("/");
            let response = await fetch(detailsUrl);
            let details = await response.json();
            let iteration = details.iteration;
            url = `https://api.slin.dev/grab/v1/download/${id.split(":").join("/")}/${iteration}`;
        }
    }
    let level = await openProto(url);
    importedLevel = level;

    let complexity = 0;

    level.levelNodes.forEach(node => {
        complexity += loadLevelNode(node, scene);
    });

    let ambience = level.ambienceSettings;
    let sky = [
        [0, 0, 0],
        [0, 0, 0]
    ];
    
    if (ambience) {
        if (ambience.skyZenithColor) {
            sky[0][0] = (ambience?.skyZenithColor?.r || 0) * 255;
            sky[0][1] = (ambience?.skyZenithColor?.g || 0) * 255;
            sky[0][2] = (ambience?.skyZenithColor?.b || 0) * 255;
        }
        if (ambience.skyHorizonColor) {
            sky[1][0] = (ambience?.skyHorizonColor?.r || 0) * 255;
            sky[1][1] = (ambience?.skyHorizonColor?.g || 0) * 255;
            sky[1][2] = (ambience?.skyHorizonColor?.b || 0) * 255;
        }
    }

    document.body.style.backgroundImage = `linear-gradient(rgb(${sky[0][0]}, ${sky[0][1]}, ${sky[0][2]}), rgb(${sky[1][0]}, ${sky[1][1]}, ${sky[1][2]}), rgb(${sky[0][0]}, ${sky[0][1]}, ${sky[0][2]}))`;
    
    console.log(level);
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

        // grab info
        cube.grabInfo = {
            type: 'group'
        };

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
        
        let color = {
            "r": 0,
            "g": 0,
            "b": 0,
            "a": 1
        };
        if (material == 8) {
            node.color.r ? color.r = node.color.r : null;
            node.color.g ? color.g = node.color.g : null;
            node.color.b ? color.b = node.color.b : null;
            objectMaterial.uniforms.colors.value = new THREE.Vector3(color.r, color.g, color.b);
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

        // grab info
        objectShape.grabInfo = {
            type: 'static',
            shape: shape,
            material: material,
            color: color,
            isNeon: node?.isNeon
        };

        let targetVector = new THREE.Vector3();
        let targetQuaternion = new THREE.Quaternion();
        let worldMatrix = new THREE.Matrix4();
        worldMatrix.compose(
            objectShape.getWorldPosition(targetVector), 
            objectShape.getWorldQuaternion(targetQuaternion), 
            objectShape.getWorldScale(targetVector)
        );

        let normalMatrix = new THREE.Matrix3();
        normalMatrix.getNormalMatrix(worldMatrix);
        objectMaterial.uniforms.worldNormalMatrix.value = normalMatrix;

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

        // grab info
        objectShape.grabInfo = {
            type: 'crumbling',
            shape: shape,
            material: material,
            stableTime: node?.stableTime,
            respawnTime: node?.respawnTime
        };

        let targetVector = new THREE.Vector3();
        let targetQuaternion = new THREE.Quaternion();
        let worldMatrix = new THREE.Matrix4();
        worldMatrix.compose(
            objectShape.getWorldPosition(targetVector), 
            objectShape.getWorldQuaternion(targetQuaternion), 
            objectShape.getWorldScale(targetVector)
        );

        let normalMatrix = new THREE.Matrix3();
        normalMatrix.getNormalMatrix(worldMatrix);
        objectMaterial.uniforms.worldNormalMatrix.value = normalMatrix;

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

         // grab info
         objectShape.grabInfo = {
            type: 'sign',
            text: node?.text
        };

        parent.add(objectShape);
        objects.push(objectShape);

        return 5; // complexity
    } else if (node.levelNodeStart) {
        node = node.levelNodeStart;

        let objectShape = shapes[6].clone();
        objectShape.material = startMaterial;

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.rotation.w ? objectShape.quaternion.w = node.rotation.w : objectShape.quaternion.w = 0;
        node.rotation.x ? objectShape.quaternion.x = node.rotation.x : objectShape.quaternion.x = 0;
        node.rotation.y ? objectShape.quaternion.y = node.rotation.y : objectShape.quaternion.y = 0;
        node.rotation.z ? objectShape.quaternion.z = node.rotation.z : objectShape.quaternion.z = 0;
        node.radius ? objectShape.scale.x = node.radius : objectShape.scale.x = 0;
        node.radius ? objectShape.scale.z = node.radius : objectShape.scale.z = 0;

         // grab info
         objectShape.grabInfo = {
            type: 'start'
        };

        parent.add(objectShape);
        objects.push(objectShape);

        return 0;
    } else if (node.levelNodeFinish) {
        node = node.levelNodeFinish;

        let objectShape = shapes[6].clone();
        objectShape.material = finishMaterial;

        node.position.x ? objectShape.position.x = node.position.x : objectShape.position.x = 0;
        node.position.y ? objectShape.position.y = node.position.y : objectShape.position.y = 0;
        node.position.z ? objectShape.position.z = node.position.z : objectShape.position.z = 0;
        node.radius ? objectShape.scale.x = node.radius : objectShape.scale.x = 0;
        node.radius ? objectShape.scale.z = node.radius : objectShape.scale.z = 0;

        // grab info
        objectShape.grabInfo = {
            type: 'finish'
        };

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

function deleteCurrent() {
    scene.remove(current);
    objects.splice(objects.indexOf(current), 1);
    scene.remove(control);
}

function cloneCurrent() {
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
    obj.grabInfo = current.grabInfo;

    scene.add( obj );
    objects.push( obj );
}

function handleKey(e) {
    if (e.which == 68) { // d
        cloneCurrent();
    } else if (e.which == 84) { // t
        control.setMode( "translate" );
    } else if (e.which == 82) { // r
        control.setMode( "rotate" );
    } else if (e.which == 83) { // s
        control.setMode( "scale" );
    } else if (e.which == 46) { // delete
        deleteCurrent();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function exportScene() {
    let level = {
        formatVersion: 7,
        title: importedLevel.title,
        creators: importedLevel.creators,
        description: importedLevel.description,
        maxCheckpointCount: importedLevel.maxCheckpointCount,
        ambienceSettings: importedLevel.ambienceSettings,
        levelNodes: []
    };

    function exportNode(node, parent) {
        let info = node.grabInfo;
        if (info.type === "group") {
            let group = {
                levelNodeGroup: {
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    scale: {
                        x: node.scale.x,
                        y: node.scale.y,
                        z: node.scale.z
                    },
                    rotation: {
                        x: node.quaternion.x,
                        y: node.quaternion.y,
                        z: node.quaternion.z,
                        w: node.quaternion.w
                    },
                    childNodes: []
                }
            };
            parent.push(group);
            node.children.forEach(object => {
                if (object.grabInfo) {
                    exportNode(object, group.levelNodeGroup.childNodes);
                }
            });
        } else if (info.type === "static") {
            let obj = {
                levelNodeStatic: {
                    shape: info.shape,
                    material: info.material,
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    scale: {
                        x: node.scale.x,
                        y: node.scale.y,
                        z: node.scale.z
                    },
                    rotation: {
                        x: node.quaternion.x,
                        y: node.quaternion.y,
                        z: node.quaternion.z,
                        w: node.quaternion.w
                    }
                }
            };
            info.color ? obj.levelNodeStatic.color = info.color : null;
            info.isNeon ? obj.levelNodeStatic.isNeon = info.isNeon : null;
            parent.push(obj);
        } else if (info.type === 'crumbling') {
            let obj = {
                levelNodeCrumbling: {
                    shape: info.shape,
                    material: info.material,
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    scale: {
                        x: node.scale.x,
                        y: node.scale.y,
                        z: node.scale.z
                    },
                    rotation: {
                        x: node.quaternion.x,
                        y: node.quaternion.y,
                        z: node.quaternion.z,
                        w: node.quaternion.w
                    },
                    stableTime: info.stableTime,
                    respawnTime: info.respawnTime
                }
            };
            parent.push(obj);
        } else if (info.type === 'sign') {
            let obj = {
                levelNodeSign: {
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    rotation: {
                        x: node.quaternion.x,
                        y: node.quaternion.y,
                        z: node.quaternion.z,
                        w: node.quaternion.w
                    },
                    text: info.text
                }
            };
            parent.push(obj);
        } else if (info.type === 'start') {
            let obj = {
                levelNodeStart: {
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    rotation: {
                        x: node.quaternion.x,
                        y: node.quaternion.y,
                        z: node.quaternion.z,
                        w: node.quaternion.w
                    },
                    radius: node.scale.x
                }
            };
            parent.push(obj);
        } else if (info.type === 'finish') {
            let obj = {
                levelNodeFinish: {
                    position: {
                        x: node.position.x,
                        y: node.position.y,
                        z: node.position.z
                    },
                    radius: node.scale.x
                }
            };
            parent.push(obj);
        }
    }
    scene.children.forEach(object => {
        if (object.grabInfo) {
            exportNode(object, level.levelNodes);
        }
    });

    console.log(level);

    let {root} = protobuf.parse(PROTOBUF_DATA, { keepCase: true });
    let message = root.lookupType("COD.Level.Level");
    let errMsg = message.verify(level);
    if (errMsg) {
        throw Error(errMsg);
    }
    let buffer = message.encode(message.create(level)).finish();
    let blob = new Blob([buffer], {type: "application/octet-stream"});
    let link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = (Date.now()).toString().slice(0, -3)+".level";
    link.click();
}

init();