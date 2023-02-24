import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/TransformControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@v0.132.0/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.145.0/examples/jsm/webxr/VRButton.min.js";
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.126/examples/jsm/renderers/CSS2DRenderer.js';

$( document ).ready(function() {
    $('.objects > div').click(function() {
        if ($(this).hasClass('object')) {
            if ($('#cube').hasClass('selected')) {
                new Cube($(this).attr('id'));
            } else if ($('#sphere').hasClass('selected')) {
                new Sphere($(this).attr('id'));
            } else if ($('#cylinder').hasClass('selected')) {
                new Cylinder($(this).attr('id'));
            } else if ($('#pyramid').hasClass('selected')) {
                new Pyramid($(this).attr('id'));
            } else if ($('#prism').hasClass('selected')) {
                new Prism($(this).attr('id'));
            }
        if ($(this).hasClass('objct-sign')) {
            new Sign();
        }
        }
    });
    $('.shape').click(function() {
        $('.shape.selected').removeClass('selected');
        $(this).addClass('selected');
    });
    //
    $(document).mousedown(function(e) {
        if (e.button == 1) {
            drag.enabled = false;
        }
    });
    $(document).mouseup(function(e) {
        if (e.button == 1) {
            drag.enabled = true;
        }
    });

    $(document).keydown(function(e) {
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
            control.setMode( "translate" );
        }
        if (e.which == 82) {
            control.setMode( "rotate" );
        }
        if (e.which == 83) {
            control.setMode( "scale" );
        }
        if (e.which == 46) {
            scene.remove(current);
            objects.splice(objects.indexOf(current), 1);
            scene.remove(control);
        }
    });
    $('#scale').click(function() {
        control.setMode( "scale" );
    });
    $('#rotate').click(function() {
        control.setMode( "rotate" );
    });
    $('#move').click(function() {
        control.setMode( "translate" );
    });
    $('#clone').click(function() {
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
    });
    $('#delete').click(function() {
        scene.remove(current);
        objects.splice(objects.indexOf(current), 1);
        scene.remove(control);
    });
});

let camera, scene, renderer, light, controls, control, drag, current;
let objects = [];
let loader = new GLTFLoader();

class Cube {
    constructor(img) {
        let model = loader.load('models/cube.gltf', function(gltf) {
            let geometry = gltf.scene.children[0].geometry;
            // let geometry = new THREE.BoxGeometry( 1, 1, 1 );
            let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
            let material = new THREE.MeshPhongMaterial( { map: texture } );
            let cube = new THREE.Mesh( geometry, material );
            scene.add( cube );
            objects.push( cube );
        });
    }
}
class Sphere {
    constructor(img) {
        let geometry = new THREE.SphereGeometry( .5, 16, 8 );
        let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        let sphere = new THREE.Mesh( geometry, material );
        scene.add( sphere );
        objects.push( sphere );
    }
}
class Cylinder {
    constructor(img) {
        let geometry = new THREE.CylinderGeometry( .5, .5, 1, 16 );
        let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        let cylinder = new THREE.Mesh( geometry, material );
        scene.add( cylinder );
        objects.push( cylinder );
    }
}
class Pyramid {
    constructor(img) {
        let model = loader.load('models/pyramid.gltf', function(gltf) {
            let geometry = gltf.scene.children[0].geometry;
            let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
            let material = new THREE.MeshPhongMaterial( { map: texture } );
            let pyramid = new THREE.Mesh( geometry, material );
            scene.add( pyramid );
            objects.push( pyramid );
        });
    }
}
class Prism {
    constructor(img) {
        let model = loader.load('models/prism.gltf', function(gltf) {
            let geometry = gltf.scene.children[0].geometry;
            let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
            let material = new THREE.MeshPhongMaterial( { map: texture } );
            let prism = new THREE.Mesh( geometry, material );
            scene.add( prism );
            objects.push( prism );
        });
    }
}
class Sign {
    constructor() {
        let model = loader.load('models/sign.gltf', function(gltf) {
            let geometry = gltf.scene.children[0].geometry;
            let texture = new THREE.TextureLoader().load( 'textures/wood.png' );
            let material = new THREE.MeshPhongMaterial( { map: texture } );
            let sign = new THREE.Mesh( geometry, material );
            scene.add( sign );
            objects.push( sign );
            console.log(sign);
        });
    }
}




init();

render();


function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth - 300, window.innerHeight );
    document.getElementsByTagName('main')[0].appendChild( renderer.domElement );
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, (window.innerWidth - 300) / window.innerHeight, 0.1, 1000 );
    camera.position.z = 5;
    light = new THREE.AmbientLight(0xffffff)
    scene.add(light)
    controls = new OrbitControls( camera, renderer.domElement );
    // controls.addEventListener( 'change', render );
    controls.mouseButtons = {LEFT: 2, MIDDLE: 1, RIGHT: 0}
    control = new TransformControls( camera, renderer.domElement );
    // control.addEventListener( 'change', render );
    control.addEventListener( 'dragging-changed', function ( event ) {
        controls.enabled = ! event.value;
    } );
    new Cube('default');
    // for ( var i = 0; i < objects.length; i ++ ) {
    //     control.attach( objects[ i ] );
    //     scene.add( control );
    // }

    const div = document.createElement( 'div' );
    div.className = 'label';
    div.textContent = 'X';
    div.style.marginTop = '-1em';
    const label = new CSS2DObject( div );
    label.position.set( 0, 0.2, 0 );
    scene.add( label );
    label.layers.set( 0 );

    drag = new DragControls( objects, camera, renderer.domElement)
    // drag.enabled = false;
    drag.addEventListener( 'dragstart', function ( event ) { 
        controls.enabled = false;
        current = event.object;
        event.object.material.emmissive = '0xffffff';
        control.attach( event.object );
        scene.add( control );
    } );
    drag.addEventListener( 'dragend', function ( event ) { 
        controls.enabled = true;
        event.object.material.emmissive = '0x000000';
    } );
    window.addEventListener( 'resize', onWindowResize );

    
}

function onWindowResize() {
    camera.aspect = (window.innerWidth - 300) / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth - 300, window.innerHeight );

    render();
}


function render() {
    requestAnimationFrame( render );
    renderer.render(scene, camera);
}
var VRSButton = VRButton.createButton( renderer )

document.body.appendChild( VRSButton );
VRSButton.addEventListener( 'click', function () {
    
});
renderer.xr.enabled = true;
renderer.setAnimationLoop( function () {

	renderer.render( scene, camera );

} );