import React, { useEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import {
  CylinderGeometry,
  Euler,
  Matrix4,
  MeshNormalMaterial,
  Vector3
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import BackButton from '../components/BackButton.js'
import VTOButton from '../components/VTOButton.js'
import WEBARROCKSFACE from '../contrib/WebARRocksFace/dist/WebARRocksFace.module.js'
import NN from '../contrib/WebARRocksFace/neuralNets/NN_EARS_4.json'
import earrings3DHelper from '../contrib/WebARRocksFace/helpers/WebARRocksFaceEarrings3DHelper.js'
import lightingHelper from '../contrib/WebARRocksFace/helpers/WebARRocksFaceLightingHelper.js'
// ASSETS:
// import 3D model of earrings:
const GLTFEarringsModel_1 = 'https://arpimages.s3.us-west-1.amazonaws.com/aiassets/1.glb' // '../../assets/earrings3D/1.glb'
// import GLTFEarringsModel_2 from '../../assets/earrings3D/2.glb'
// import GLTFEarringsModel_3 from '../../assets/earrings3D/3.glb'
// import ringPath1 from '../../assets/img/rings/1.jpg';
// import ringPath2 from '../../assets/img/rings/2.jpg';
// import ringPath3 from '../../assets/img/rings/3.jpg';

const GLTFEarringsModel = "https://arpimages.s3.us-west-1.amazonaws.com/aiassets/1.glb";
import envMap from '../../assets/earrings3D/venice_sunset_512.hdr';

let _earrings3DHelper = null;

// Fetch the file using no-cors mode and create a Blob URL
const CORS_PROXY_URL = "https://cors-anywhere.herokuapp.com/";

// Fetch the file using a proxy server with CORS enabled
async function fetchModelAsBlobURL(url) {
  const response = await fetch(CORS_PROXY_URL + url, { mode: "cors" });
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

const ThreeGrabber = (props) => {
  const threeFiber = useThree()
  console.log(threeFiber);
  useFrame(_earrings3DHelper.update_threeCamera.bind(null, props.sizing, threeFiber.camera))
  threeFiber.gl.setPixelRatio(window.devicePixelRatio || 1)
  lightingHelper.set(threeFiber.gl, threeFiber.scene, props.lighting)
  return null
}
const compute_sizing = () => {
  const height = window.innerHeight
  const wWidth = window.innerWidth
  const width = Math.min(wWidth, height)
  const top = 0
  const left = (wWidth - width ) / 2
  return {width, height, top, left}
}
const set_shinyMetal = (model) => {
  model.traverse((threeStuff) => {
    if (!threeStuff.isMesh){
      return
    }
    const mat = threeStuff.material
    mat.roughness = 0
    mat.metalness = 1
    mat.refractionRatio = 1
  })
}
const create_occluderMesh = (occluderCylinder, side) => {
  const occluderRightGeom = new CylinderGeometry(occluderCylinder.radius, occluderCylinder.radius, occluderCylinder.height)
  const matrix = new Matrix4().makeRotationFromEuler(new Euler().fromArray(occluderCylinder.euler))
  matrix.setPosition(new Vector3().fromArray(occluderCylinder.offset))
  occluderRightGeom.applyMatrix4(matrix)
  const occluderMesh = _earrings3DHelper.create_threeOccluderMesh(occluderRightGeom, side)
  return occluderMesh
}

const EarringContainer = (props) => {
  const objRef = useRef()
  useEffect(() => {
    const threeObject3D = objRef.current;
    _earrings3DHelper.set_earring(threeObject3D, props.side);
    const occluderMesh = create_occluderMesh(props.occluderCylinder, props.side);
    if (props.occluderCylinder.debug){
      occluderMesh.material = new MeshNormalMaterial();
    }
    threeObject3D.add(occluderMesh);
  }, [props.GLTFModel, props.sizing]);
  const gltf = useLoader(GLTFLoader, props.GLTFModel)
  const model = gltf.scene.clone()
  // tweak the model:
  set_shinyMetal(model)
  return (
    <object3D ref={objRef}>
      <primitive object={model} scale={props.scale} />
    </object3D>
    )
}
const DebugCube = () => {
  return (
    <mesh name="debugCube">
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshNormalMaterial />
    </mesh>
    )
}


const Earrings3D = (props) => {
  const PI = 3.1415
  const scale = 100
  const [sizing, setSizing] = useState(compute_sizing())
  const [GLTFModelRight, setModelRight] = useState(null)
  const [GLTFModelLeft, setModelLeft] = useState(null)
  const [isInitialized] = useState(true)
  const canvasFaceRef = useRef()

  // Fetch the GLTF models as Blob URLs
  useEffect(() => {
    const fetchModels = async () => {
      const modelRightBlobURL = await fetchModelAsBlobURL(GLTFEarringsModel);
      setModelRight(modelRightBlobURL);
      const modelLeftBlobURL = await fetchModelAsBlobURL(GLTFEarringsModel);
      setModelLeft(modelLeftBlobURL);
    }

    fetchModels();
  }, []);

  const capture_image = () => {
    // const button = document.querySelector("#screenshot-button");
    // button.addEventListener("click", async () => {
    const canvas_earring = document.querySelectorAll("canvas").item(0);
    const canvas_camera = document.querySelectorAll("canvas").item(1);

    // Set the dimensions of the combined canvas to be the max of the two canvases
    const combinedWidth = Math.max(canvas_earring.width, canvas_camera.width);
    const combinedHeight = Math.max(
      canvas_earring.height,
      canvas_camera.height
    );

    const canvas_capture = document.createElement("canvas");
    canvas_capture.width = combinedWidth;
    canvas_capture.height = combinedHeight;

    const ctx3 = canvas_capture.getContext("2d");
    ctx3.drawImage(canvas_camera, 0, 0, combinedWidth, combinedHeight);
    ctx3.drawImage(canvas_earring, 0, 0, combinedWidth, combinedHeight);

    // Reverse the canvas horizontally
    ctx3.translate(canvas_capture.width, 0);
    ctx3.scale(-1, 1);

    // Draw the horizontally reversed canvas onto the combined canvas
    ctx3.drawImage(
      canvas_capture,
      0,
      0,
      canvas_capture.width,
      canvas_capture.height,
      0,
      0,
      canvas_capture.width,
      canvas_capture.height
    );

    const link = document.createElement("a");
    link.download = "screenshot.png";
    link.href = canvas_capture.toDataURL();
    link.click();
    // });
  };

  const _settings = {
    scale: [scale, scale, scale],
    lighting: {
      envMap,
      pointLightIntensity: 0.8,
      pointLightY: 200, 
      hemiLightIntensity: 0.8
    },
    bloom: {
      threshold: 0.5, 
      intensity: 8, 
      kernelSizeLevel: 0, 
      computeScale: 0.5, 
      luminanceSmoothing: 0.7
    },
    earsOccluderCylinder: {
      radius: 2,
      height: 0.5,
      offset: [0, 1, 0],
      euler: [0,PI/6, PI/2, 'XYZ'],
      debug: false 
    }
  }
  let _timerResize = null
  const handle_resize = () => {
    if (_timerResize){
      clearTimeout(_timerResize)
    }
    _timerResize = setTimeout(do_resize, 200)
  }
  const do_resize = () => {
    _timerResize = null
    const newSizing = compute_sizing()
    setSizing(newSizing)
  }
  useEffect(() => {
    if (_timerResize === null) {
      WEBARROCKSFACE.resize()
    }
  }, [sizing])
  useEffect(() => {
    _earrings3DHelper = earrings3DHelper()
    _earrings3DHelper.init(WEBARROCKSFACE, {
      NN,
      canvasFace: canvasFaceRef.current,
      debugOccluder: false
    }).then(() => {
      window.addEventListener('resize', handle_resize)
      window.addEventListener('orientationchange', handle_resize)
      console.log('WEBARROCKSFACE has been initialized')
    })
    return WEBARROCKSFACE.destroy
  }, [isInitialized])
  return (
    <div>
      <Canvas className='mirrorX' style={{
        position: 'fixed',
        zIndex: 2,
        ...sizing
      }}
      gl={{
        preserveDrawingBuffer: true 
      }}
      updateDefaultCamera = {false}
      >
        <ThreeGrabber sizing={sizing} lighting={_settings.lighting} />
        {GLTFModelRight && (
          <Suspense fallback={<DebugCube />}>
            <EarringContainer side='RIGHT' scale={_settings.scale} GLTFModel={GLTFModelRight} occluderCylinder={_settings.earsOccluderCylinder} sizing={sizing}/>
          </Suspense>
        )}
        {GLTFModelLeft && (
          <Suspense fallback={<DebugCube />}>
            <EarringContainer side='LEFT'  scale={_settings.scale} GLTFModel={GLTFModelLeft} occluderCylinder={_settings.earsOccluderCylinder} sizing={sizing}/>
          </Suspense>
        )}
        <EffectComposer>
          <Bloom luminanceThreshold={_settings.bloom.threshold} luminanceSmoothing={_settings.bloom.luminanceSmoothing} intensity={_settings.bloom.intensity}
            kernelSize={_settings.bloom.kernelSizeLevel}
            height={_settings.bloom.computeScale * sizing.height}/>
        </EffectComposer>
      </Canvas>
      <canvas className='mirrorX' ref={canvasFaceRef} style={{
        position: 'fixed',
        zIndex: 1,
        ...sizing
      }} width = {sizing.width} height = {sizing.height} />

      <BackButton />
    </div>
  )
} 
export default Earrings3D