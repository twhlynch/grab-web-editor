import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { DragControls } from 'DragControls';
import { TransformControls } from 'TransformControls';
import { GLTFLoader } from 'GLTFLoader';
import { VRButton } from 'VRButton';
import { CSS2DRenderer, CSS2DObject } from 'CSS2D';

let current;
let objects = [];

/* SETUP */

let renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.getElementsByTagName('main')[0].appendChild( renderer.domElement );

let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera( 75, (window.innerWidth) / window.innerHeight, 0.1, 1000 );
camera.position.set( 0, 0, 5 );

window.addEventListener( 'resize', () => {
    camera.aspect = (window.innerWidth) / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
});

let light = new THREE.AmbientLight(0xffffff);
scene.add(light);

let orbitController = new OrbitControls( camera, renderer.domElement );
orbitController.mouseButtons = {LEFT: 2, MIDDLE: 1, RIGHT: 0};

let transformController = new TransformControls( camera, renderer.domElement );
transformController.addEventListener( 'dragging-changed', function ( event ) {
    controls.enabled = ! event.value;
} );

// let dragController = new DragControls( objects, camera, renderer.domElement)
// dragController.addEventListener( 'dragstart', function ( event ) { 
//     controls.enabled = false;
//     current = event.object;
//     event.object.material.emmissive = '0xffffff';
//     control.attach( event.object );
//     scene.add( control );
// } );
// dragController.addEventListener( 'dragend', function ( event ) { 
//     controls.enabled = true;
//     event.object.material.emmissive = '0x000000';
// } );

function render() {
    requestAnimationFrame( render );
    renderer.render(scene, camera);
}
let XRButton = VRButton.createButton( renderer )

document.body.appendChild( XRButton );
XRButton.addEventListener( 'click', function () {
    renderer.xr.enabled = true;
    renderer.setAnimationLoop( function () {
        renderer.render( scene, camera );
    });
});

/* adding level */

function readArrayBuffer(file) {
    return new Promise(function(resolve, reject) {
        let reader = new FileReader();
        reader.onload = function() {
            let data = reader.result;
            protobuf.load("proto/level.proto", function(err, root) {
                if(err) throw err;
                let message = root.lookupType("COD.Level.Level");
                let decoded = message.decode(new Uint8Array(data));
                let object = message.toObject(decoded);
                resolve(object);
            });
        }
        reader.onerror = function() {
            reject(reader);
        }
        reader.readAsArrayBuffer(file);
    });
}

document.getElementById('file').addEventListener("change", function(e) {
    let files = e.target.files;
    let readers = [];

    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
        let p = document.createElement('p');
        p.innerText = files[i].name;
        document.getElementById('file-display').appendChild(p);
        readers.push(readArrayBuffer(files[i]));
    }

    Promise.all(readers).then((values) => {
        console.log(values);
        loadLevel(values);
    });
}, false);

function loadLevelNode(node) {
    if (node.levelNodeGroup) {
        node.levelNodeGroup.childNodes.forEach((childNode) => {
            loadLevelNode(childNode);
        });
        return;
    } else if (node.levelNodeStatic) { 
        node = node.levelNodeStatic;
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        let texture = new THREE.TextureLoader().load( 'textures/default.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        var cube = new THREE.Mesh(geometry, material);
        node.position.x ? cube.position.x = node.position.x : cube.position.x = 0;
        node.position.y ? cube.position.y = node.position.y : cube.position.y = 0;
        node.position.z ? cube.position.z = node.position.z : cube.position.z = 0;
        node.rotation.w ? cube.quaternion.w = node.rotation.w : cube.quaternion.w = 1;
        node.rotation.x ? cube.quaternion.x = node.rotation.x : cube.quaternion.x = 0;
        node.rotation.y ? cube.quaternion.y = node.rotation.y : cube.quaternion.y = 0;
        node.rotation.z ? cube.quaternion.z = node.rotation.z : cube.quaternion.z = 0;
        node.scale.x ? cube.scale.x = node.scale.x : cube.scale.x = 1;
        node.scale.y ? cube.scale.y = node.scale.y : cube.scale.y = 1;
        node.scale.z ? cube.scale.z = node.scale.z : cube.scale.z = 1;
        scene.add(cube);
        objects.push(cube);
    } else if (node.levelNodeCrumbling) {
        node = node.levelNodeCrumbling;
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        let texture = new THREE.TextureLoader().load( 'textures/grabbable_crumbling.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        var cube = new THREE.Mesh(geometry, material);
        node.position.x ? cube.position.x = node.position.x : cube.position.x = 0;
        node.position.y ? cube.position.y = node.position.y : cube.position.y = 0;
        node.position.z ? cube.position.z = node.position.z : cube.position.z = 0;
        node.rotation.w ? cube.quaternion.w = node.rotation.w : cube.quaternion.w = 1;
        node.rotation.x ? cube.quaternion.x = node.rotation.x : cube.quaternion.x = 0;
        node.rotation.y ? cube.quaternion.y = node.rotation.y : cube.quaternion.y = 0;
        node.rotation.z ? cube.quaternion.z = node.rotation.z : cube.quaternion.z = 0;
        node.scale.x ? cube.scale.x = node.scale.x : cube.scale.x = 1;
        node.scale.y ? cube.scale.y = node.scale.y : cube.scale.y = 1;
        node.scale.z ? cube.scale.z = node.scale.z : cube.scale.z = 1;
        scene.add(cube);
        objects.push(cube);
    }
}

function loadLevel(levelData) {
    levelData[0].levelNodes.forEach((node) => {
        loadLevelNode(node);
    });
}

document.addEventListener( 'keydown', function ( e ) {
    if (e.which == 68) {
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
    if (e.which == 84) {
        transformController.setMode( "translate" );
    }
    if (e.which == 82) {
        transformController.setMode( "rotate" );
    }
    if (e.which == 83) {
        transformController.setMode( "scale" );
    }
    if (e.which == 46) {
        scene.remove(current);
        objects.splice(objects.indexOf(current), 1);
        scene.remove(transformController);
    }
});

render();