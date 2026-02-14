// ================================
// FUNCIONES DE MANEJO DE IMÁGENES
// ================================

// Convertir imagen a Base64 para colaboradores
function previewImage(event, previewId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #e2e8f0;">`;
            
            // Guardar en el campo hidden correspondiente
            if (previewId === 'colaboradorFotoPreview') {
                document.getElementById('colaboradorFoto').value = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

// Preview de múltiples imágenes para equipos
function previewMultipleImages(event) {
    const files = event.target.files;
    const preview = document.getElementById('equipoFotosPreview');
    const fotosArray = [];
    
    if (files.length > 0) {
        preview.innerHTML = '';
        let loadedCount = 0;
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotosArray.push(e.target.result);
                
                const fotoDiv = document.createElement('div');
                fotoDiv.style.position = 'relative';
                fotoDiv.innerHTML = `
                    <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                    <button type="button" onclick="borrarFotoIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                    <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
                `;
                preview.appendChild(fotoDiv);
                
                loadedCount++;
                if (loadedCount === files.length) {
                    document.getElementById('equipoFotos').value = JSON.stringify(fotosArray);
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// Borrar foto individual del equipo
function borrarFotoIndividual(index) {
    const fotosHidden = document.getElementById('equipoFotos').value;
    if (fotosHidden) {
        let fotosArray = JSON.parse(fotosHidden);
        fotosArray.splice(index, 1);
        document.getElementById('equipoFotos').value = JSON.stringify(fotosArray);
        
        // Re-renderizar las fotos
        const preview = document.getElementById('equipoFotosPreview');
        preview.innerHTML = '';
        
        fotosArray.forEach((foto, idx) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoIndividual(${idx})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${idx + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
        
        showNotification('🗑️ Foto eliminada', 'success');
    }
}

// Borrar todas las fotos del equipo
function borrarTodasFotos() {
    document.getElementById('equipoFotos').value = '';
    document.getElementById('equipoFotosPreview').innerHTML = '';
    document.getElementById('equipoFotosInput').value = '';
    showNotification('🗑️ Todas las fotos eliminadas', 'success');
}

// Borrar foto de colaborador
function borrarFoto(tipo) {
    if (tipo === 'colaborador') {
        document.getElementById('colaboradorFoto').value = '';
        document.getElementById('colaboradorFotoPreview').innerHTML = '';
        document.getElementById('colaboradorFotoInput').value = '';
        showNotification('🗑️ Foto eliminada', 'success');
    }
}

// Preview de múltiples imágenes para celulares
function previewMultipleCelularImages(event) {
    const files = event.target.files;
    const preview = document.getElementById('celularFotosPreview');
    const fotosArray = [];
    
    if (files.length > 0) {
        preview.innerHTML = '';
        let loadedCount = 0;
        
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                fotosArray.push(e.target.result);
                
                const fotoDiv = document.createElement('div');
                fotoDiv.style.position = 'relative';
                fotoDiv.innerHTML = `
                    <img src="${e.target.result}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                    <button type="button" onclick="borrarFotoCelularIndividual(${index})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                    <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${index + 1}</p>
                `;
                preview.appendChild(fotoDiv);
                
                loadedCount++;
                if (loadedCount === files.length) {
                    document.getElementById('celularFotos').value = JSON.stringify(fotosArray);
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// Borrar foto individual del celular
function borrarFotoCelularIndividual(index) {
    const fotosHidden = document.getElementById('celularFotos').value;
    if (fotosHidden) {
        let fotosArray = JSON.parse(fotosHidden);
        fotosArray.splice(index, 1);
        document.getElementById('celularFotos').value = JSON.stringify(fotosArray);
        
        // Re-renderizar las fotos
        const preview = document.getElementById('celularFotosPreview');
        preview.innerHTML = '';
        
        fotosArray.forEach((foto, idx) => {
            const fotoDiv = document.createElement('div');
            fotoDiv.style.position = 'relative';
            fotoDiv.innerHTML = `
                <img src="${foto}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e2e8f0;">
                <button type="button" onclick="borrarFotoCelularIndividual(${idx})" style="position: absolute; top: 5px; right: 5px; background: #f56565; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center;">×</button>
                <p style="margin-top: 5px; font-size: 0.75em; color: #64748b; text-align: center;">Foto ${idx + 1}</p>
            `;
            preview.appendChild(fotoDiv);
        });
        
        showNotification('🗑️ Foto eliminada', 'success');
    }
}

// Borrar todas las fotos del celular
function borrarTodasFotosCelular() {
    document.getElementById('celularFotos').value = '';
    document.getElementById('celularFotosPreview').innerHTML = '';
    document.getElementById('celularFotosInput').value = '';
    showNotification('🗑️ Todas las fotos eliminadas', 'success');
}

// Función para ampliar foto (modal simple)
function ampliarFoto(fotoSrc) {
    const modalAmpliada = document.createElement('div');
    modalAmpliada.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
    modalAmpliada.innerHTML = `<img src="${fotoSrc}" style="max-width: 90%; max-height: 90%; border-radius: 12px;">`;
    modalAmpliada.onclick = function() {
        document.body.removeChild(modalAmpliada);
    };
    document.body.appendChild(modalAmpliada);
}
