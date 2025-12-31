
// ================= SCROLL FADE RTL =================

const fadeElements = document.querySelectorAll(".fade-rtl");

const fadeObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                entry.target.classList.remove("fade-out");
            } else {
                // وقتی از دید خارج میشه
                entry.target.classList.remove("is-visible");
                entry.target.classList.add("fade-out");
            }
        });
    },
    {
        threshold: 0.25, // چند درصد المنت داخل ویو باشه فعال میشه
    }
);

// فعال‌سازی
fadeElements.forEach((el) => fadeObserver.observe(el));
























// ================= BASIC SETUP =================
const canvas = document.createElement("canvas");
canvas.className = "three-scene";
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();

// ================= CAMERA =================
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 1.2, 5);

// ================= LIGHT =================
scene.add(new THREE.AmbientLight(0x062900, 0.6));
const dir = new THREE.DirectionalLight(0x545454, 1.5);
dir.position.set(5, 10, 5);
scene.add(dir);

// ================= MODEL / ANIMATION =================
let model;
let mixer;
const clock = new THREE.Clock();

// ================= SCROLL DATA =================
let scrollSpeed = 0;
let lastScrollY = window.scrollY;
let scrollSmooth = 0;

// ================= LOAD MODEL =================
const loader = new THREE.GLTFLoader();
loader.load("model/canglong.glb", (gltf) => {
    model = gltf.scene;

    model.position.set(0, 1, -3);
    updateScale();

    // ---- material + fresnel shader ----
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.map && (child.material.map.encoding = THREE.sRGBEncoding);

            child.material.onBeforeCompile = (shader) => {
                shader.uniforms.fresnelColor = { value: new THREE.Color(0x8cffc5) };
                shader.uniforms.fresnelPower = { value: 2.0 };

                shader.fragmentShader =
                    "uniform vec3 fresnelColor; uniform float fresnelPower;\n" +
                    shader.fragmentShader;

                shader.fragmentShader = shader.fragmentShader.replace(
                    "#include <output_fragment>",
                    `
          float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), fresnelPower);
          vec3 finalColor = outgoingLight + fresnel * fresnelColor;
          gl_FragColor = vec4(finalColor, diffuseColor.a);
          `
                );
            };

            child.material.needsUpdate = true;
        }
    });

    // ---- GLTF animations ----
    if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
        });
    }

    scene.add(model);
});

// ================= SECTIONS =================
const sections = document.querySelectorAll("section");

// ================= IDLE MOTION =================
let idleTime = 0;

// ================= TARGETS =================
let targetX = 0;
let targetRotY = 0;

// ================= SCROLL LISTENER =================
window.addEventListener("scroll", () => {
    const currentY = window.scrollY;
    scrollSpeed = currentY - lastScrollY;
    lastScrollY = currentY;
});

// ================= HELPERS =================
function updateScale() {
    if (!model) return;

    const w = window.innerWidth;

    // clamp عرض صفحه
    const minW = 360;
    const maxW = 1920;

    // scale متناظر
    const minScale = 0.012;
    const maxScale = 0.022;

    // نرمال‌سازی
    const t = Math.min(Math.max((w - minW) / (maxW - minW), 0), 1);

    // lerp
    const s = minScale + (maxScale - minScale) * t;

    model.scale.setScalar(s);
}

function updateTargets() {
    const scrollProgress =
        window.scrollY / (document.body.scrollHeight - window.innerHeight);

    const sectionValue = scrollProgress * (sections.length - 1);
    const index = Math.floor(sectionValue);
    const t = sectionValue - index;

    const dirA = index % 2 === 0 ? -1 : 1;
    const dirB = (index + 1) % 2 === 0 ? -1 : 1;

    const moveAmount = window.innerWidth < 768 ? 1.0 : 1.8;

    targetX = THREE.MathUtils.lerp(dirA * moveAmount, dirB * moveAmount, t);
    targetRotY = THREE.MathUtils.lerp(dirA * 0.4, dirB * 0.4, t);
}

// ================= ANIMATE =================
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // smooth scroll speed
    scrollSmooth += (scrollSpeed - scrollSmooth) * 0.1;
    scrollSpeed *= 0.9;

    if (model) {
        updateTargets();

        // ---- smooth section movement ----
        model.position.x += (targetX - model.position.x) * 0.06;
        model.rotation.y += (targetRotY - model.rotation.y) * 0.06;

        // ---- idle motion (alive) ----
        idleTime += 0.02;
        model.position.y += Math.sin(idleTime) * 0.005;
        model.rotation.z += Math.sin(idleTime) * 0.002;
        model.rotation.x += Math.cos(idleTime * 0.7) * 0.003;
        model.rotation.z += Math.cos(idleTime * 0.7) * 0.002;
        model.position.x += Math.cos(idleTime * 0.7) * 0.003;

        // ---- scroll reaction ----
        model.rotation.y += scrollSmooth * 0.0003;
    }

    renderer.render(scene, camera);
}

animate();

// ================= RESIZE =================
window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    updateScale();
});
