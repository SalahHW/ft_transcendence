import * as BABYLON from '@babylonjs/core';

// Modernized createScene function
export const createScene = (engine, canvas) => {
    const scene = new BABYLON.Scene(engine);

    // Set up environment
    const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        "https://raw.githubusercontent.com/PatrickRyanMS/BabylonJStextures/master/DDS/Runyon_Canyon_A_2k_cube_specular.dds",
        scene
    );
    hdrTexture.name = "envTex";
    hdrTexture.gammaSpace = false;
    scene.environmentTexture = hdrTexture;

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
        "ArcRotateCamera",
        1,
        1.25,
        50,
        new BABYLON.Vector3(0, 0, 0),
        scene
    );
    camera.attachControl(canvas, true);

    // Analytical Light
    const directionalLight = new BABYLON.DirectionalLight(
        "directional",
        new BABYLON.Vector3(0.5, -2.0, 0.0),
        scene
    );

    // Scene color
    scene.clearColor = new BABYLON.Color4(0.6, 0.7, 0.6, 1);

    // Ground
    const ground = BABYLON.Mesh.CreatePlane("ground", 500.0, scene);
    ground.position = new BABYLON.Vector3(0, 0, 0);
    ground.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);

    const groundMat = new BABYLON.PBRMetallicRoughnessMaterial("groundMat", scene);
    groundMat.baseTexture = new BABYLON.Texture("textures/rockyGround_basecolor.png", scene);
    groundMat.normalTexture = new BABYLON.Texture("textures/rockyGround_normal.png", scene);
    groundMat.metallicRoughnessTexture = new BABYLON.Texture("textures/rockyGround_metalRough.png", scene);

    groundMat.baseTexture.uScale = 40.0;
    groundMat.baseTexture.vScale = 40.0;
    groundMat.normalTexture.uScale = 40.0;
    groundMat.normalTexture.vScale = 40.0;
    groundMat.metallicRoughnessTexture.uScale = 40.0;
    groundMat.metallicRoughnessTexture.vScale = 40.0;

    ground.material = groundMat;
    ground.material.backFaceCulling = false;

    // Set up new rendering pipeline
    const pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene);

    // Tone mapping
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1;

    // Bloom
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.3;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;

    // Explosion trigger via keydown (for testing/demo)
    //const explode = event => {
    //    if (event.keyCode === 32) {
    //        BABYLON.ParticleHelper.CreateAsync("explosion", scene).then(set => {
    //            set.systems.forEach(s => {
    //                s.disposeOnStop = true;
    //            });
    //            set.start();
    //        });
    //    }
    //};

    document.addEventListener('keydown', explode);

    // Remove listener when scene is disposed
    scene.onDisposeObservable.add(() => {
        document.removeEventListener('keydown', explode);
    });

    return scene;
};

// New explosion effect function to be called when a paddle is hit
//export const createExplosion = (scene, position, options = {}) => {
//    BABYLON.ParticleHelper.CreateAsync("explosion", scene).then(particleSet => {
//        particleSet.systems.forEach(system => {
//            system.emitter = position.clone();
//            system.disposeOnStop = true;
//        });
//        particleSet.start();
//    });
//};
export const createExplosion = (scene, position, options = {}) => {
    BABYLON.ParticleHelper.CreateAsync("explosion", scene).then(particleSet => {
        particleSet.systems.forEach(system => {
            system.emitter = position.clone();
            system.disposeOnStop = true;

            // === Size Reduction ===
            system.minSize *= 0.9;
            system.maxSize *= 0.9;

            // === Speed Increase ===
            system.minEmitPower *= 0.2;
            system.maxEmitPower *= 0.2;

            // === Duration Shortening ===
            system.targetStopDuration *= 0.02;

            // Optional: fade particles out faster
            system.minLifeTime *= 9.0;
            system.maxLifeTime *= 9.0;
        });

        particleSet.start();
    });
};