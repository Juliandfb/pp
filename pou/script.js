"use strict"; // Activa el modo estricto para ayudar a detectar errores
console.clear(); // Limpia la consola al iniciar

// Clase que representa la escena del juego
class Stage {
    constructor() {
        // Método para renderizar la escena
        this.render = function () {
            this.renderer.render(this.scene, this.camera);
        };
        
        // Método para añadir un elemento a la escena
        this.add = function (elem) {
            this.scene.add(elem);
        };
        
        // Método para eliminar un elemento de la escena
        this.remove = function (elem) {
            this.scene.remove(elem);
        };
        
        // Contenedor del juego
        this.container = document.getElementById('game');
        
        // Configuración del renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#D0CBC7', 1);
        this.container.appendChild(this.renderer.domElement);
        
        // Creación de la escena
        this.scene = new THREE.Scene();
        
        // Configuración de la cámara
        let aspect = window.innerWidth / window.innerHeight;
        let d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        // Iluminación
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        
        // Evento para redimensionar la ventana
        window.addEventListener('resize', () => this.onResize());
        this.onResize(); // Ajustar al inicio
    }
    
    // Método para mover la cámara
    setCamera(y, speed = 0.3) {
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    }
    
    // Método para ajustar la cámara al cambiar el tamaño de la ventana
    onResize() {
        let viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    }
}

// Clase que representa un bloque en el juego
class Block {
    constructor(block) {
        // Estados posibles del bloque
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12; // Cantidad de movimiento
        this.dimension = { width: 0, height: 0, depth: 0 }; // Dimensiones del bloque
        this.position = { x: 0, y: 0, z: 0 }; // Posición del bloque
        this.targetBlock = block; // Bloque objetivo
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1; // Índice del bloque
        this.workingPlane = this.index % 2 ? 'x' : 'z'; // Plano de trabajo
        this.workingDimension = this.index % 2 ? 'width' : 'depth'; // Dimensión de trabajo

        // Establecer las dimensiones del bloque
        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);

        // Establecer el color del bloque
        if (!this.targetBlock) {
            this.color = 0x333344; // Color por defecto
        } else {
            let offset = this.index + this.colorOffset;
            var r = Math.sin(0.3 * offset) * 55 + 200;
            var g = Math.sin(0.3 * offset + 2) * 55 + 200;
            var b = Math.sin(0.3 * offset + 4) * 55 + 200;
            this.color = new THREE.Color(r / 255, g / 255, b / 255); // Color dinámico
        }

        // Estado inicial del bloque
        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;

        // Dirección del movimiento
        this.speed = -0.1 - (this.index * 0.005);
        if (this.speed < -4)
            this.speed = -4; // Limitar la velocidad
        this.direction = this.speed;

        // Crear el bloque en 3D
        let geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.FlatShading });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.state == this.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT; // Posición aleatoria inicial
        }
    }

    // Método para invertir la dirección del bloque
    reverseDirection() {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    }

    // Método para colocar el bloque
    place() {
        this.state = this.STATES.STOPPED; // Cambiar el estado a detenido
        let overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        let blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };
        
        // Verificar si el bloque se solapa con el bloque objetivo
        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true; // Se otorga un bonus
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }
        
        // Si hay solapamiento
        if (overlap > 0) {
            let choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap; // Dimensiones del bloque cortado
            this.dimension[this.workingDimension] = overlap; // Actualizar dimensión del bloque colocado
            let placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            let placedMesh = new THREE.Mesh(placedGeometry, this.material); // Crear el bloque colocado
            let choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            let choppedMesh = new THREE.Mesh(choppedGeometry, this.material); // Crear el bloque cortado
            let choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            
            // Ajustar la posición de los bloques
            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            } else {
                choppedPosition[this.workingPlane] += overlap; // Actualizar posición del bloque cortado
            }
            
            placedMesh.position.set(this.position.x, this.position.y, this.position.z); // Posicionar el bloque colocado
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z); // Posicionar el bloque cortado
            blocksToReturn.placed = placedMesh; // Almacenar el bloque colocado
            if (!blocksToReturn.bonus)
                blocksToReturn.chopped = choppedMesh; // Almacenar el bloque cortado
        } else {
            this.state = this.STATES.MISSED; // Si no hay solapamiento, el bloque se pierde
        }
        this.dimension[this.workingDimension] = overlap; // Actualizar dimensión final
        return blocksToReturn; // Devolver información sobre el bloque colocado y cortado
    }

    // Método que actualiza la posición del bloque cada tick
    tick() {
        if (this.state == this.STATES.ACTIVE) {
            let value = this.position[this.workingPlane];
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
                this.reverseDirection(); // Cambiar dirección si se sale de los límites
            this.position[this.workingPlane] += this.direction; // Actualizar posición
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane]; // Mover la malla del bloque
        }
    }
}

// Clase que representa el juego en sí
class Game {
    constructor() {
        // Estados posibles del juego
        this.STATES = {
            'LOADING': 'loading',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting'
        };
        this.blocks = []; // Array para almacenar bloques
        this.state = this.STATES.LOADING; // Estado inicial del juego
        this.stage = new Stage(); // Crear la escena
        this.mainContainer = document.getElementById('container'); // Contenedor principal
        this.scoreContainer = document.getElementById('score'); // Contenedor de puntuación
        this.startButton = document.getElementById('start-button'); // Botón de inicio
        this.instructions = document.getElementById('instructions'); // Instrucciones
        this.scoreContainer.innerHTML = '0'; // Inicializar la puntuación a 0
        this.newBlocks = new THREE.Group(); // Grupo para nuevos bloques
        this.placedBlocks = new THREE.Group(); // Grupo para bloques colocados
        this.choppedBlocks = new THREE.Group(); // Grupo para bloques cortados
        this.stage.add(this.newBlocks); // Añadir grupos a la escena
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);
        this.addBlock(); // Añadir el primer bloque
        this.tick(); // Iniciar el ciclo de actualización
        this.updateState(this.STATES.READY); // Cambiar estado a listo
        
        // Eventos de teclado y mouse para la acción del juego
        document.addEventListener('keydown', e => {
            if (e.keyCode == 32) // Tecla de espacio
                this.onAction();
        });
        document.addEventListener('click', e => {
            this.onAction(); // Acción al hacer clic
        });
        document.addEventListener('touchstart', e => {
            e.preventDefault();
            // this.onAction(); // Evitar acción inmediata al tocar (temporal)
        });
    }

    // Método para actualizar el estado del juego
    updateState(newState) {
        for (let key in this.STATES)
            this.mainContainer.classList.remove(this.STATES[key]); // Eliminar clases de estado anteriores
        this.mainContainer.classList.add(newState); // Añadir clase del nuevo estado
        this.state = newState; // Actualizar estado
    }

    // Método que maneja la acción del jugador
    onAction() {
        switch (this.state) {
            case this.STATES.READY:
                this.startGame(); // Iniciar el juego
                break;
            case this.STATES.PLAYING:
                this.placeBlock(); // Colocar el bloque
                break;
            case this.STATES.ENDED:
                this.restartGame(); // Reiniciar el juego
                break;
        }
    }

    // Método para iniciar el juego
    startGame() {
        if (this.state != this.STATES.PLAYING) {
            this.scoreContainer.innerHTML = '0'; // Reiniciar la puntuación
            this.updateState(this.STATES.PLAYING); // Cambiar estado a jugando
            this.addBlock(); // Añadir el primer bloque
        }
    }

    // Método para reiniciar el juego
    restartGame() {
        this.updateState(this.STATES.RESETTING); // Cambiar a estado de reinicio
        let oldBlocks = this.placedBlocks.children; // Obtener bloques antiguos
        let removeSpeed = 0.2; // Velocidad de eliminación
        let delayAmount = 0.02; // Retraso entre eliminaciones
        
        // Animar la eliminación de los bloques
        for (let i = 0; i < oldBlocks.length; i++) {
            TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: () => this.placedBlocks.remove(oldBlocks[i]) });
            TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
        }
        
        // Animar la cámara
        let cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
        this.stage.setCamera(2, cameraMoveSpeed); // Mover la cámara hacia arriba
        let countdown = { value: this.blocks.length - 1 }; // Contador para la puntuación
        TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: () => { this.scoreContainer.innerHTML = String(Math.round(countdown.value)); } });
        this.blocks = this.blocks.slice(0, 1); // Mantener solo el primer bloque
        setTimeout(() => {
            this.startGame(); // Reiniciar el juego después de un tiempo
        }, cameraMoveSpeed * 1000);
    }

    // Método para colocar un bloque
    placeBlock() {
        let currentBlock = this.blocks[this.blocks.length - 1]; // Obtener el bloque actual
        let newBlocks = currentBlock.place(); // Colocar el bloque actual
        this.newBlocks.remove(currentBlock.mesh); // Eliminar la malla del bloque actual
        if (newBlocks.placed)
            this.placedBlocks.add(newBlocks.placed); // Añadir bloque colocado a la escena
        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped); // Añadir bloque cortado a la escena
            let positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: () => this.choppedBlocks.remove(newBlocks.chopped) };
            let rotateRandomness = 10; // Aleatoriedad de rotación
            
            // Parámetros de rotación
            let rotationParams = {
                delay: 0.05,
                x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                y: Math.random() * 0.1,
            };
            
            // Ajustar la posición del bloque cortado según su dirección
            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            } else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }
            TweenLite.to(newBlocks.chopped.position, 1, positionParams); // Animar la posición del bloque cortado
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams); // Animar la rotación del bloque cortado
        }
        this.addBlock(); // Añadir un nuevo bloque
    }

    // Método para añadir un nuevo bloque
    addBlock() {
        let lastBlock = this.blocks[this.blocks.length - 1]; // Obtener el último bloque
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            return this.endGame(); // Terminar el juego si el último bloque se perdió
        }
        this.scoreContainer.innerHTML = String(this.blocks.length - 1); // Actualizar la puntuación
        let newKidOnTheBlock = new Block(lastBlock); // Crear un nuevo bloque basado en el anterior
        this.newBlocks.add(newKidOnTheBlock.mesh); // Añadir la malla del nuevo bloque
        this.blocks.push(newKidOnTheBlock); // Almacenar el nuevo bloque
        this.stage.setCamera(this.blocks.length * 2); // Ajustar la cámara
        if (this.blocks.length >= 5)
            this.instructions.classList.add('hide'); // Ocultar instrucciones después de 5 bloques
    }

    // Método que termina el juego
    endGame() {
        this.updateState(this.STATES.ENDED); // Cambiar estado a terminado
    }

    // Método de actualización del juego
    tick() {
        this.blocks[this.blocks.length - 1].tick(); // Actualizar el último bloque
        this.stage.render(); // Renderizar la escena
        requestAnimationFrame(() => { this.tick(); }); // Continuar el ciclo de actualización
    }
}

// Iniciar el juego
let game = new Game();
