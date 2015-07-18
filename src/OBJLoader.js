var OBJLoader = {
    cached: {},
    requests: {}
};

OBJLoader.load = function load(url, cb, computeNormals) {
    if (! this.cached[url]) {
        if(! this.requests[url]) {
            this.requests[url] = [cb];
            loadURL(
                url,
                _onsuccess.bind(
                    this,
                    url,
                    computeNormals
                )
            );
        } else {
            this.requests[url].push(cb);
        }
    } else {
        cb(this.cached[url]);
    }
};

function _onsuccess(url, computeNormals, text) {
    var buffers = OBJLoader.format.call(this, text, computeNormals);
    this.cached[url] = buffers;

    for (var i = 0; i < this.requests[url].length; i++) {
        this.requests[url][i](buffers);
    }

    this.requests[url] = null;
};

OBJLoader.format = function format(text, computeNormals) {
    var lines = text.split('\n');

    var faceTextureCoord = []; 
    var vertexNormal = []; 
    var textureCoord = [];
    var faceVertex = [];
    var faceNormal = []; 
    var vertices = [];
    var texcoord;
    var normal;
    var vertex;
    var index;
    var i1, i2, i3, i4, vx, vy;
    var vz, tx, ty, nx, ny, nz;
    var length = lines.length;
    var line;

    for(var i = 0; i < length; i++) {
        line = lines[i]; 
        
        //Vertex Positions
        if(line.indexOf('v ') !== -1) {
            vertex = line.split(' ');                
            vx = parseFloat(vertex[1]); 
            vy = parseFloat(vertex[2]); 
            vz = parseFloat(vertex[3]); 
            vertices.push([vx, vy, vz]);                 
        }   

        //Texture Coords
        else if(line.indexOf('vt ') !== -1) {
            texcoord = line.split(' ');       
            tx = parseFloat(texcoord[1]); 
            ty = parseFloat(texcoord[2]); 
            textureCoord.push([tx, ty]);                                 
        }

        //Vertex Normals
        else if(line.indexOf('vn ') !== -1) {
            normal = line.split(' ');                       
            nx = parseFloat(normal[1]); 
            ny = parseFloat(normal[2]); 
            nz = parseFloat(normal[3]);                 
            vertexNormal.push([nx, ny, nz]);                  
        }

        //Faces
        else if(line.indexOf('f ') !== -1) {
            index = line.split(' ');
            
            //Vertex//Normal
            if(index[1].indexOf('//') !== -1) {
                i1 = index[1].split('//');
                i2 = index[2].split('//'); 
                i3 = index[3].split('//'); 
                faceVertex.push([
                    parseFloat(i1[0])-1, 
                    parseFloat(i2[0])-1, 
                    parseFloat(i3[0])-1
                ]); 
                faceNormal.push([
                    parseFloat(i1[1])-1, 
                    parseFloat(i2[1])-1, 
                    parseFloat(i3[1])-1
                ]);

                if(index[4]) {
                    i4 = index[4].split('/');
                    faceVertex.push([
                        parseFloat(i1[0])-1, 
                        parseFloat(i3[0])-1, 
                        parseFloat(i4[0])-1
                    ]); 
                    faceNormal.push([
                        parseFloat(i1[2])-1, 
                        parseFloat(i3[2])-1, 
                        parseFloat(i4[2])-1
                    ]);
                }
            }

            //Vertex/Texcoord/Normal
            else if(index[1].indexOf('/') !== -1) {
                i1 = index[1].split('/');
                i2 = index[2].split('/');
                i3 = index[3].split('/');
                faceVertex.push([
                    parseFloat(i1[0])-1, 
                    parseFloat(i2[0])-1, 
                    parseFloat(i3[0])-1
                ]); 
                faceTextureCoord.push([
                    parseFloat(i1[1])-1, 
                    parseFloat(i2[1])-1, 
                    parseFloat(i3[1])-1
                ]);                     
                faceNormal.push([
                    parseFloat(i1[2])-1, 
                    parseFloat(i2[2])-1, 
                    parseFloat(i3[2])-1
                ]);

                if(index[4]) {
                    i4 = index[4].split('/');
                    faceVertex.push([
                        parseFloat(i1[0])-1, 
                        parseFloat(i3[0])-1, 
                        parseFloat(i4[0])-1
                    ]); 
                    faceTextureCoord.push([
                        parseFloat(i1[1])-1, 
                        parseFloat(i3[1])-1, 
                        parseFloat(i4[1])-1
                    ]);                     
                    faceNormal.push([
                        parseFloat(i1[2])-1, 
                        parseFloat(i3[2])-1, 
                        parseFloat(i4[2])-1
                    ]);
                }
            }

            //Vertex
            else {
                faceVertex.push([
                    parseFloat(index[1])-1, 
                    parseFloat(index[2])-1, 
                    parseFloat(index[3])-1
                ]); 
                faceTextureCoord.push([
                    parseFloat(index[1])-1, 
                    parseFloat(index[2])-1, 
                    parseFloat(index[3])-1
                ]); 
                faceNormal.push([
                    parseFloat(index[1])-1, 
                    parseFloat(index[2])-1, 
                    parseFloat(index[3])-1
                ]); 

                if(index[4]) {
                    faceVertex.push([
                        parseFloat(index[1])-1, 
                        parseFloat(index[3])-1, 
                        parseFloat(index[4])-1
                    ]); 
                    faceTextureCoord.push([
                        parseFloat(index[1])-1, 
                        parseFloat(index[3])-1, 
                        parseFloat(index[4])-1
                    ]);                     
                    faceNormal.push([
                        parseFloat(index[1])-1, 
                        parseFloat(index[3])-1, 
                        parseFloat(index[4])-1
                    ]);
                }
            }
        }
    }

    var n = [];
    var v = [];
    var t = [];
    var f = [];
    var vertexCache = {};
    var count = 0;
    var uvCoord;
    var j;

    for (i = 0; i < faceVertex.length; i++) {
        f[i] = [];
        for (j = 0; j < faceVertex[i].length; j++) {
            uvCoord = faceTextureCoord[i][j];
            vertex  = faceVertex[i][j];
            normal  = faceNormal[i][j];

            index = vertexCache[vertex + ',' + normal + ',' + uvCoord];
            
            if(index === undefined) {
                index = count++;
                v.push(vertices[vertex]);
                if(vertexNormal[normal])  n.push(vertexNormal[normal]);
                if(textureCoord[uvCoord]) t.push(textureCoord[uvCoord]);
                vertexCache[vertex + ',' + normal + ',' + uvCoord] = index;
            }
            f[i].push(index);
        }
    }

    n = computeNormals ? GeometryHelper.computeNormals(f, v) :  n;

    return {
        vertices: flatten(v),
        normals: flatten(n),
        textureCoords: flatten(t),
        indices: flatten(f)
    };
};

function flatten(arr) {
    var out = [];    
    var len = arr.length;

    for (var i = 0; i < len; i++) {
        if (Array.isArray(arr[i])) 
            Array.prototype.push.apply(out, arr[i]);
        else
            Array.prototype.push.call(out, arr[i]);
    }

    return out;
}

function loadURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function onreadystatechange() {
        if (this.readyState === 4) {
            if (callback) callback(this.responseText);
        }
    };
    xhr.open('GET', url);
    xhr.send();
};

module.exports = OBJLoader;