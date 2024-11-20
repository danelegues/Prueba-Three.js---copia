import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Mantener el WebGLRenderer para el modelo
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true  // Habilitar transparencia
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Fondo transparente
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

// Crear la escena
const scene = new THREE.Scene();

// Crear la cámara
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 2, 15);

// Aumentar la intensidad de la luz ambiental para que haya más luz en la escena
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

// Crear una luz puntual adicional para iluminar más la escena
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(3, 5, 3);
scene.add(pointLight);

let pivot; // Contenedor para el modelo
let isDragging = false; // Estado para verificar si se está arrastrando
let previousMousePosition = { x: 0, y: 0 };

// Añadir después de las declaraciones iniciales
const cardRadius = 10; // Aumentar el radio para que las tarjetas estén más lejos del modelo
const cards = [];

function createCards() {
    const totalCards = 16;
    
    for (let i = 0; i < totalCards; i++) {
        const cardGeometry = new THREE.PlaneGeometry(1.7, 2.5);
        const cardMaterial = new THREE.MeshStandardMaterial({
            color: 0x442222,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
            depthTest: true,
            depthWrite: true,
            borderColor: 0xffa500,
            borderWidth: 0.1
        });
        
        const card = new THREE.Mesh(cardGeometry, cardMaterial);
        scene.add(card);
        cards.push(card);
    }
}

function updateCards() {
    if (!cards.length || !pivot) return;
    
    const speed = 0.8;
    const baseAngle = Date.now() * 0.001 * speed;
    
    // Actualizar cada tarjeta
    cards.forEach((card, index) => {
        // Distribuir las tarjetas uniformemente añadiendo un offset basado en su índice
        const angleOffset = (index / cards.length) * Math.PI * 2;
        const angle = baseAngle + angleOffset;
        
        // Calcular el ángulo actual en grados (0-360)
        const currentAngle = (angle % (2 * Math.PI)) * (180 / Math.PI);
        
        // Radio constante para mantener una circunferencia perfecta
        const radius = 7;
        
        // Actualizar posición con menos desnivel en Y
        card.position.x = Math.cos(angle) * radius;
        card.position.z = (Math.sin(angle) * radius * 0.15) - 2;
        card.position.y = (-Math.sin(angle) * 0.8) - 0.4;
        
        // Sincronizar la rotación Y con el ángulo de desplazamiento (invertido) y añadir 90 grados
        card.rotation.y = -angle + Math.PI/2;
        
        // Calcular escala basada en la posición en la circunferencia
        const minScale = 0.7;
        const maxScale = 1.3;
        const scaleFactor = (Math.sin(angle) + 1) / 2;
        const currentScale = minScale + (maxScale - minScale) * scaleFactor;
        
        // Aplicar escala
        card.scale.set(currentScale, currentScale, currentScale);
        
        // Ajustar la opacidad y profundidad basado en la posición en la circunferencia
        if (currentAngle >= 0 && currentAngle <= 180) {
            card.material.depthTest = false;
            card.material.depthWrite = false;
            card.renderOrder = 999;
            card.material.opacity = 0.9;
        } else {
            card.material.depthTest = true;
            card.material.depthWrite = true;
            card.renderOrder = -1;
            card.material.opacity = 0.9;
        }
    });
    
    requestAnimationFrame(updateCards);
}

// Cargar el modelo 3D
const loader = new GLTFLoader().setPath('cajaCsgo/');
loader.load(
  'scene.gltf',
  (gltf) => {
    console.log('Modelo cargado');
    const model = gltf.scene;
    
    // Añadir escala al modelo (1 + 0.005 = 1.005 para un 0.5% más grande)
    model.scale.set(1.155, 1.155, 1.155);
    
    // Configurar el material del modelo para manejar correctamente la profundidad
    model.traverse((object) => {
        if (object.isMesh) {
            object.material.depthTest = true;
            object.material.depthWrite = true;
            object.renderOrder = 0;
        }
    });
    
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    pivot = new THREE.Group();
    model.position.sub(center);
    pivot.add(model);
    scene.add(pivot);
    
    camera.lookAt(pivot.position);
    
    createCards();
    updateCards();
  },
  undefined,
  (error) => {
    console.error('Error loading model:', error);
  }
);

// Manejar eventos del ratón para arrastrar
window.addEventListener('mousedown', (event) => {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
});

window.addEventListener('mousemove', (event) => {
  if (!isDragging || !pivot) return;

  const deltaMove = {
    x: event.clientX - previousMousePosition.x,
    y: event.clientY - previousMousePosition.y,
  };

  const rotationSpeed = 0.002; // Ajusta la sensibilidad del giro
  pivot.rotation.y += deltaMove.x * rotationSpeed; // Rotación en el eje Y (horizontal)
  pivot.rotation.x += deltaMove.y * rotationSpeed; // Rotación en el eje X (vertical)

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY,
  };
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Ajustar el tamaño del renderizador cuando cambie el tamaño de la ventana
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Función de animación
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// Asegurarnos de que la escena tenga la profundidad habilitada
scene.matrixAutoUpdate = true;
