import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'https://unpkg.com/three@0.145.0/examples/jsm/controls/DragControls.js';

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
            }
            
        }
    });
    $('.shape').click(function() {
        $('.shape.selected').removeClass('selected');
        $(this).addClass('selected');
    });
    $(document).keydown(function(e) {
        if (e.which == 17) {
            controls.mouseButtons = {LEFT: 0, MIDDLE: 1, RIGHT: 2}
            drag.deactivate();
        }
    });
    $(document).keyup(function(e) {
        if (e.which == 17) {
            controls.mouseButtons = {}
            drag.activate();
        }
        if (e.which == 68) {
            let geometry = current.geometry;
            let material = current.material;
            let obj = new THREE.Mesh( geometry, material );
            obj.scale.x = current.scale.x;
            obj.scale.y = current.scale.y;
            obj.scale.z = current.scale.z;
            obj.rotation._x = current.rotation._x;
            obj.rotation._y = current.rotation._y;
            obj.rotation._z = current.rotation._z;
            obj.position.x = current.position.x;
            obj.position.y = current.position.y;
            obj.position.z = current.position.z;
            scene.add( obj );
            objects.push( obj );
        }
    });
});

let camera, scene, renderer, controls, drag, current;
let objects = [];

class Cube {
    constructor(img) {
        let geometry = new THREE.BoxGeometry( 1, 1, 1 );
        let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        let cube = new THREE.Mesh( geometry, material );
        scene.add( cube );
        objects.push( cube );
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
        let geometry = new THREE.TetrahedronGeometry( .5, 0 );
        let texture = new THREE.TextureLoader().load( 'textures/'+img+'.png' );
        let material = new THREE.MeshBasicMaterial( { map: texture } );
        let pyramid = new THREE.Mesh( geometry, material );
        scene.add( pyramid );
        objects.push( pyramid );
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
    controls = new OrbitControls( camera, renderer.domElement );
    controls.mouseButtons = {}
    drag = new DragControls( objects, camera, renderer.domElement)

    drag.addEventListener( 'dragstart', function ( event ) { current = event.object; console.log(event.object); } );
}

function render() {
    requestAnimationFrame( render );
    renderer.render(scene, camera);
}