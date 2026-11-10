
// ============================================================================
// GEOMETRIA OBUDOWY HEKSAGONALNEJ + DACH (1:1 w milimetrach)
// ============================================================================
const HEX = {
  R_OUT: 500.0,
  A_OUT: 433.01,
  R_ALU_C: 482.68,
  R_ALU_IN: 465.36,
  R_PIR_IN: 442.26,
  R_PLY_IN: 428.41,
  Z_WEB: 25,
  Z_FLANGE: 25,
  ZB: 185,
  ZBT: 215,
  Z_PLY: 220,  // po blasze Al 5 mm (Z = 215–220)
  Z_PIR: 277,
  Z_RAIL: 830,
  Z_TOP: 860,
  HOLE_R: 79.2,      // Ø158,4 mm (otulina Ø152,3 + 3 mm luzu na stronę)
  SEAL_IN_R: 76.15   // Ø152,3 mm (rura Ø114,3 + 2×19 mm Armaflex)
};

const ROOF = {
  // R_PLY_IN = 440.26 → wewnętrzne lico okładziny Dibond 2 mm (442.26 - 2.0)
  R_OUT: 500, R_ALU_C: 482.68, R_ALU_IN: 465.36, R_PIR_IN: 442.26, R_PLY_IN: 440.26,
  R_SKIRT_OUT: 511, R_EAVE_OUT: 536,
  Z_SPLIT: 860, Z_SKIRT_BOT: 825, Z_PLUG_BOT: 845, Z_EPDM_TOP: 872,
  Z_BOT_RAIL_TOP: 902, Z_TOP_RAIL_BOT: 1170, Z_WALL_TOP: 1200,
  Z_CEIL_TOP: 1240, Z_PEAK: 1364, Z_CAP_TOP: 1388
};

const PARAMS = {
  ARM: 500, PW: 30, PH: 40, PT: 3, PRAD: 100, ZT: 50,
  TL: 350, TR: 57.15, TRI: 53.15, ARMA_T: 19, ZTOP: 400,
  FLR: 70, ZFL: 412, G10_T: 10, ZG10: 422, DR: 62, DT: 12,
  ROD_H: 369, ROD_R: 11, ROD_PCD_R: 40, BOSS_R: 30, BOSS_H: 15,
  BOSS_HOLE_R: 5, BRAD: 82, M6R: 30, FC: 470, FP: 50
};
const ARM_ANGLES = [0, 120, 240].map(d => d * Math.PI / 180);

let scene, camera, renderer, controls;
let clipPlaneAA;

let isSectionActive = false;
let isEquipVisible = true;
let isParkedPose = true;
let isSolarScreensVisible = true;
let isBallastVisible = true;
let areDimsVisible = true;

let hexRootGroup, solarScreensGroup, ballastGroup, equipEnvelopeGroup, otaPivotGroup, pierLiftGroup;
let roofMasterGroup = null;
let roofWallsGroup = null;
let roofScreensGroup = null;
let roofCeilingPirGroup = null;
let roofRaftersGroup = null;
let roofTropikSlopesGroup = null;
let assemblyView = 'both';
let isRoofVisible = true;
let isRoofLifted = false;
let isRoofExploded = false;
let isTropikSkinVisible = true;
let targetMasterLiftY = 0;
let targetCeilingExplodeY = 0;
let targetSlopesExplodeY = 0;
let roofWallPanelsExplosionList = [];
let roofLayerExplosions = []; // ekrany dachu: większy factor niż kaseta (jak hexLayerExplosions)
let roofSolarScreenLayers = [];
let targetWallsRadialExplode = 0;
let hexWallUnitsExplosionList = [];
let hexLayerExplosions = [];
let hexSolarScreenLayers = [];
let hexNorthSkinGroup = null;
let isHexWallsExploded = false;
let targetHexWallsExplode = 0;

const allMaterials = [];
const dimLabels = [];

let matAluFrame, matBlackSteel, matWhiteDibond, matSolarScreen, matSnapSpacer, matPirFoam;
let matPlywood, matG10Spacer, matArmaflex, matBallast, matHeater, matFan;
let matEquipBody, matEquipRedCat, matEdge;
let matTropikDibond, matEpdmSeal, matInoxHardware, matMeshScreen;
let matSilverInox, matSilverThread, matSilverAlum, matQuartzSand, matPurFoam;
let matBattery, matPiBoard, matDinBox, matCabGlass, matSensor, matCharger, matDish;
let extensionGroup, extensionUpperSubGroup, g10SpacerGroup, m6ScrewsGroup, armaflexMesh, pierBallastGroup;
let isHeadExploded = false;
let targetExplodeY = 0;

function P3(x, y, z) {
  return new THREE.Vector3(x, z, -y);
}
function toThreePos(x, y, z) { return P3(x, y, z); }

function createStudioEnvMap() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0.0, '#1e2430');
  g.addColorStop(0.45, '#f1f5f9');
  g.addColorStop(0.50, '#272e3d');
  g.addColorStop(0.55, '#13161c');
  g.addColorStop(1.0, '#090a0d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 25, 150, 55);
  ctx.fillRect(290, 18, 175, 65);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function initMaterials(envMap) {
  clipPlaneAA = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.05);
  const reg = (m) => { allMaterials.push(m); return m; };

  matAluFrame = reg(new THREE.MeshStandardMaterial({ color: 0xd1d8e2, metalness: 0.82, roughness: 0.25, envMap, envMapIntensity: 1.25, side: THREE.DoubleSide }));
  matBlackSteel = reg(new THREE.MeshStandardMaterial({ color: 0x1a1e26, metalness: 0.78, roughness: 0.30, envMap, envMapIntensity: 1.25, side: THREE.DoubleSide }));
  matWhiteDibond = reg(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.15, roughness: 0.08, envMap, envMapIntensity: 1.15, side: THREE.DoubleSide }));
  matSolarScreen = reg(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.15, roughness: 0.08, envMap, envMapIntensity: 1.15, side: THREE.DoubleSide })); // Dibond 2 mm biały
  matSnapSpacer = reg(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.55, envMap, envMapIntensity: 0.4, side: THREE.DoubleSide })); // tulejka dystansowa PA6/PTFE Ø20×24
  matPirFoam = reg(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.02, roughness: 0.84, side: THREE.DoubleSide }));
  matPlywood = reg(new THREE.MeshStandardMaterial({ color: 0xd4a373, metalness: 0.05, roughness: 0.65, side: THREE.DoubleSide }));
  matG10Spacer = reg(new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.12, roughness: 0.40, envMap, envMapIntensity: 0.7, side: THREE.DoubleSide }));
  matArmaflex = reg(new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.05, roughness: 0.88, side: THREE.DoubleSide }));
  matBallast = reg(new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.05, roughness: 0.90, transparent: true, opacity: 0.86, side: THREE.DoubleSide }));
  matHeater = reg(new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.35, side: THREE.DoubleSide }));
  matFan = reg(new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.3, roughness: 0.35, side: THREE.DoubleSide }));
  matEquipBody = reg(new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  matEquipRedCat = reg(new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.65, roughness: 0.22, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  matEdge = reg(new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.40 }));
  matTropikDibond = reg(new THREE.MeshStandardMaterial({ color: 0xe0f2fe, metalness: 0.22, roughness: 0.07, envMap, envMapIntensity: 1.3, side: THREE.DoubleSide }));
  matEpdmSeal = reg(new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.05, roughness: 0.92, side: THREE.DoubleSide }));
  matInoxHardware = reg(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.15, envMap, envMapIntensity: 1.45, side: THREE.DoubleSide }));
  matMeshScreen = reg(new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  matSilverInox = reg(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.16, envMap, envMapIntensity: 1.45, side: THREE.DoubleSide }));
  matSilverThread = reg(new THREE.MeshStandardMaterial({ color: 0xd8e0ea, metalness: 0.92, roughness: 0.22, envMap, envMapIntensity: 1.4, side: THREE.DoubleSide }));
  matSilverAlum = reg(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.85, roughness: 0.20, envMap, envMapIntensity: 1.35, side: THREE.DoubleSide }));
  matQuartzSand = reg(new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.02, roughness: 0.92, side: THREE.DoubleSide }));
  matPurFoam = reg(new THREE.MeshStandardMaterial({ color: 0xfde68a, metalness: 0.02, roughness: 0.85, side: THREE.DoubleSide }));
  matBattery = reg(new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.25, roughness: 0.45, side: THREE.DoubleSide }));
  matPiBoard = reg(new THREE.MeshStandardMaterial({ color: 0x166534, metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide }));
  matDinBox = reg(new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.45, roughness: 0.4, side: THREE.DoubleSide }));
  matCharger = reg(new THREE.MeshStandardMaterial({ color: 0xc2410c, metalness: 0.35, roughness: 0.45, side: THREE.DoubleSide }));
  matCabGlass = reg(new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  matDish = reg(new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.25, roughness: 0.32, side: THREE.DoubleSide }));
  matSensor = reg(new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.25, roughness: 0.4, side: THREE.DoubleSide }));
}

function addCadMesh(geometry, material, parent, edgeThreshold = 18) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const targetParent = parent || scene;
  if (targetParent && typeof targetParent.add === 'function') targetParent.add(mesh);
  const edgesGeo = new THREE.EdgesGeometry(geometry, edgeThreshold);
  const line = new THREE.LineSegments(edgesGeo, matEdge);
  mesh.add(line);
  return mesh;
}

function createPiChannelGeo(length, width, height, wall) {
  const shape = new THREE.Shape();
  const hw = width / 2, t = wall;
  shape.moveTo(-hw, 0); shape.lineTo(-hw, height); shape.lineTo(hw, height); shape.lineTo(hw, 0);
  shape.lineTo(hw - t, 0); shape.lineTo(hw - t, height - t); shape.lineTo(-hw + t, height - t); shape.lineTo(-hw + t, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  return geo;
}

function createHexWallLayerGeo(rOuter, rInner, height, trimHalfReduction = 0) {
  const c30 = Math.cos(Math.PI / 6);
  const aOut = rOuter * c30, aIn = rInner * c30;
  const xOut = Math.max(5, rOuter * 0.5 - trimHalfReduction);
  const xIn = Math.max(5, rInner * 0.5 - trimHalfReduction);
  const shape = new THREE.Shape();
  shape.moveTo(-xOut, aOut); shape.lineTo(xOut, aOut); shape.lineTo(xIn, aIn); shape.lineTo(-xIn, aIn); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function createHollowCylinderGeo(outerR, innerR, height, segments = 56) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  if (innerR > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: segments });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -height / 2, 0);
  return geo;
}
function createHollowCylinderGeometry(outerR, innerR, height, segments = 48) {
  return createHollowCylinderGeo(outerR, innerR, height, segments);
}

function createHexNutGeometry(outerRadius, innerRadius, height) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3;
    const x = outerRadius * Math.cos(ang), y = outerRadius * Math.sin(ang);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  if (innerRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
function createHexPrismGeometry(outerRadius, height) {
  return createHexNutGeometry(outerRadius, 0, height);
}

function addAluBrace(parent, from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const group = new THREE.Group();
  group.position.copy(mid);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  parent.add(group);
  const flangeA = addCadMesh(new THREE.BoxGeometry(25, len, 3), matAluFrame, group);
  flangeA.position.z = -11;
  const flangeB = addCadMesh(new THREE.BoxGeometry(3, len, 22), matAluFrame, group);
  flangeB.position.x = -11;
}

function toggleExplodeHexWalls() {
  isHexWallsExploded = !isHexWallsExploded;
  document.getElementById('btn-hex-explode')?.classList.toggle('active', isHexWallsExploded);
  targetHexWallsExplode = isHexWallsExploded ? 85 : 0;
}

/**
 * Tworzy precyzyjnie ścięty pod kątem zastrzał (profil L 30x30x4 mm)
 * wraz z wyprofilowanymi blachami węzłowymi (gussets) i śrubami M8.
 * Ścięcie dolne: pionowe (idealny styk z wewnętrzną ścianką długiej nogi).
 * Ścięcie górne: poziome (idealny styk ze spodem rygla dolnego na 2/3 szerokości).
 */
function addMiteredStrutAssembly(parent, xLegInner, xRailTarget, zLegStart, zRailBot, yWallCenter, legSide) {
  const dx = xRailTarget - xLegInner; // +265 mm (gdy noga po lewej) lub -265 mm (gdy po prawej)
  const dz = zRailBot - zLegStart;    // 185 - 52 = 133 mm
  const len = Math.hypot(dx, dz);
  const h = 30;                       // wysokość przekroju zastrzału (30 mm)
  const t = 4;                        // grubość ścianki profilu L (4 mm)

  // Przesunięcie krawędzi równoległej profilu o h=30 mm w pionie i poziomie:
  const zOffset = (h * len) / Math.abs(dx); // ścięcie pionowe na nodze (~33.5 mm)
  const xOffset = (h * len) / dz;           // ścięcie poziome pod ryglem (~67.1 mm)
  const sDir = Math.sign(dx);               // +1 lub -1 (kierunek od nogi do środka ściany)

  // 1. Środnik zastrzału (pionowa ścianka profilu L, grubość t=4 mm) - ścięty wielobok
  const webShape = new THREE.Shape();
  webShape.moveTo(xLegInner, zLegStart + zOffset);           // Dolny-górny wierzchołek przy nodze
  webShape.lineTo(xLegInner, zLegStart);                     // Dolny-dolny wierzchołek przy nodze (pionowe cięcie!)
  webShape.lineTo(xRailTarget, zRailBot);                    // Górny-zewnętrzny wierzchołek pod ryglem
  webShape.lineTo(xRailTarget - sDir * xOffset, zRailBot);   // Górny-wewnętrzny wierzchołek pod ryglem (poziome cięcie!)
  webShape.closePath();

  const webGeo = new THREE.ExtrudeGeometry(webShape, { depth: t, bevelEnabled: false });
  // W układzie P3(x, y, z) -> Three(x, z, -y): Shape(x, z) jest już w płaszczyźnie X-Y Three.js!
  const webMesh = addCadMesh(webGeo, matAluFrame, parent);
  webMesh.position.set(0, 0, -(yWallCenter + 11));

  // 2. Stopka zastrzału (dolna ścianka profilu L o szerokości 30 mm i grubości 4 mm, ścięta na obu końcach)
  const tZ = (t * len) / Math.abs(dx);
  const tX = (t * len) / dz;
  const flangeShape = new THREE.Shape();
  flangeShape.moveTo(xLegInner, zLegStart + tZ);
  flangeShape.lineTo(xLegInner, zLegStart);
  flangeShape.lineTo(xRailTarget, zRailBot);
  flangeShape.lineTo(xRailTarget - sDir * tX, zRailBot);
  flangeShape.closePath();

  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, { depth: 28, bevelEnabled: false });
  const flangeMesh = addCadMesh(flangeGeo, matAluFrame, parent);
  flangeMesh.position.set(0, 0, -(yWallCenter + 14));

  // 3. Dolna blacha węzłowa (Gusset przy nodze) - pięciokąt ze ściętym skosem łączący nogę ze wspornikiem
  const gBotShape = new THREE.Shape();
  const xLegOuter = xLegInner - sDir * 24;
  gBotShape.moveTo(xLegOuter, zLegStart - 6);
  gBotShape.lineTo(xLegInner + sDir * 52, zLegStart - 6 + (52 / Math.abs(dx)) * dz);
  gBotShape.lineTo(xLegInner + sDir * 52, zLegStart + zOffset + (52 / Math.abs(dx)) * dz);
  gBotShape.lineTo(xLegInner, zLegStart + zOffset + 18);
  gBotShape.lineTo(xLegOuter, zLegStart + zOffset + 18);
  gBotShape.closePath();

  const gBotGeo = new THREE.ExtrudeGeometry(gBotShape, { depth: 4, bevelEnabled: false });
  const gBotMesh = addCadMesh(gBotGeo, matInoxHardware, parent);
  gBotMesh.position.set(0, 0, -(yWallCenter - 15));

  // 4. Górna blacha węzłowa (Gusset pod ryglem na 2/3 szerokości) - trapezowa płytka łącząca rygiel i zastrzał
  const gTopShape = new THREE.Shape();
  gTopShape.moveTo(xRailTarget - sDir * (xOffset + 18), zRailBot + 24);
  gTopShape.lineTo(xRailTarget + sDir * 22, zRailBot + 24);
  gTopShape.lineTo(xRailTarget + sDir * 22, zRailBot);
  gTopShape.lineTo(xRailTarget - sDir * 42, zRailBot - (42 / Math.abs(dx)) * dz);
  gTopShape.lineTo(xRailTarget - sDir * (xOffset + 18), zRailBot - (42 / Math.abs(dx)) * dz);
  gTopShape.closePath();

  const gTopGeo = new THREE.ExtrudeGeometry(gTopShape, { depth: 4, bevelEnabled: false });
  const gTopMesh = addCadMesh(gTopGeo, matInoxHardware, parent);
  gTopMesh.position.set(0, 0, -(yWallCenter - 15));

  // 5. Śruby M8 spinające blachy węzłowe z nogą, ryglem i zastrzałem
  const boltPositions = [
    [xLegInner - sDir * 12, zLegStart + 10],
    [xLegInner - sDir * 12, zLegStart + 34],
    [xLegInner + sDir * 28, zLegStart + 16 + (28 / Math.abs(dx)) * dz],
    [xRailTarget - sDir * 15, zRailBot + 13],
    [xRailTarget - sDir * 45, zRailBot + 13],
    [xRailTarget - sDir * 35, zRailBot - 10]
  ];
  boltPositions.forEach(([bx, bz]) => {
    const b = addCadMesh(new THREE.CylinderGeometry(4, 4, 38, 16), matInoxHardware, parent);
    b.rotation.x = Math.PI / 2;
    b.position.copy(P3(bx, yWallCenter, bz));
  });
}

/**
 * Tworzy fazowany kątownik stopy z trapezowymi żebrami usztywniającymi (zamiast prostopadłościanów)
 */
function addHeavyFootBracket(parent, xLeg, yWallCenter, zBase, inDir, prof) {
  const xInnerFace = xLeg + inDir * (prof / 2);

  // Dolna płyta podstawy (L = 62 mm, grubość 6 mm)
  const basePlate = addCadMesh(new THREE.BoxGeometry(62, 6, 36), matBlackSteel, parent);
  basePlate.position.copy(P3(xInnerFace + inDir * 31, yWallCenter, zBase + 3));

  // Pionowa płyta przy nodze (H = 74 mm, grubość 6 mm)
  const vertPlate = addCadMesh(new THREE.BoxGeometry(6, 74, 36), matBlackSteel, parent);
  vertPlate.position.copy(P3(xInnerFace + inDir * 3, yWallCenter, zBase + 37));

  // 2 trapezowe żebra boczne ścięte pod kątem (wyciągnięte z wieloboku, a nie prostopadłościany!)
  const ribShape = new THREE.Shape();
  ribShape.moveTo(xInnerFace + inDir * 6, zBase + 6);
  ribShape.lineTo(xInnerFace + inDir * 58, zBase + 6);
  ribShape.lineTo(xInnerFace + inDir * 58, zBase + 16); // ścięty nosek przedni
  ribShape.lineTo(xInnerFace + inDir * 16, zBase + 72); // skośna krawędź usztywniająca
  ribShape.lineTo(xInnerFace + inDir * 6, zBase + 72);
  ribShape.closePath();

  const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: 4, bevelEnabled: false });
  [-15, 15].forEach(yOff => {
    const ribMesh = addCadMesh(ribGeo, matBlackSteel, parent);
    ribMesh.position.set(0, 0, -(yWallCenter + yOff + 2));
  });

  // 2 śruby poziome M8 przechodzące na wylot przez długą nogę i pionową półkę kątownika
  [zBase + 26, zBase + 56].forEach(zBolt => {
    const hBolt = addCadMesh(new THREE.CylinderGeometry(4, 4, 44, 16), matHeater, parent);
    hBolt.rotation.z = Math.PI / 2;
    hBolt.position.copy(P3(xLeg + inDir * 3, yWallCenter, zBolt));

    const hHead = addCadMesh(new THREE.CylinderGeometry(8.5, 8.5, 4, 16), matInoxHardware, parent);
    hHead.rotation.z = Math.PI / 2;
    hHead.position.copy(P3(xLeg - inDir * (prof / 2 + 2), yWallCenter, zBolt));

    const hNut = addCadMesh(new THREE.CylinderGeometry(7, 7, 6, 6), matInoxHardware, parent);
    hNut.rotation.z = Math.PI / 2;
    hNut.position.copy(P3(xInnerFace + inDir * 9, yWallCenter, zBolt));
  });

  // 2 śruby pionowe M10 wkręcane w stalowy ceownik stopy
  const vBoltX = xInnerFace + inDir * 38;
  [-9, 9].forEach(yBoltOff => {
    const vBolt = addCadMesh(new THREE.CylinderGeometry(5, 5, 28, 16), matHeater, parent);
    vBolt.position.copy(P3(vBoltX, yWallCenter + yBoltOff, zBase - 2));
    const vHead = addCadMesh(new THREE.CylinderGeometry(9, 9, 6, 6), matInoxHardware, parent);
    vHead.position.copy(P3(vBoltX, yWallCenter + yBoltOff, zBase + 9));
  });
}

function buildHexagonalObservatory() {
  hexRootGroup = new THREE.Group();
  scene.add(hexRootGroup);

  ballastGroup = new THREE.Group();
  scene.add(ballastGroup);

  solarScreensGroup = new THREE.Group();
  hexRootGroup.add(solarScreensGroup);

  hexWallUnitsExplosionList = [];
  hexLayerExplosions = [];
  hexSolarScreenLayers = [];
  hexNorthSkinGroup = null;
  const c30 = Math.cos(Math.PI / 6);

  // ==========================================================================
  // 1. TYLKO 3 POSZERZONE STOPY W WIERZCHOŁKACH 60°, 180°, 300° (BRAK KOLIZJI ZE SŁUPEM!)
  // ==========================================================================
  const footAnglesDeg = [60, 180, 300];
  const channelGeo = createPiChannelGeo(420, 220, HEX.Z_FLANGE, 5);
  channelGeo.rotateY(Math.PI / 2);

  footAnglesDeg.forEach(deg => {
    const rad = deg * Math.PI / 180;
    const footG = new THREE.Group();
    footG.rotation.y = rad;
    hexRootGroup.add(footG);
    const chMesh = addCadMesh(channelGeo, matBlackSteel, footG);
    chMesh.position.set(330, 0, 0);

    const balG = new THREE.Group();
    balG.rotation.y = rad;
    ballastGroup.add(balG);
    const bMesh = addCadMesh(new THREE.BoxGeometry(300, 50, 300), matBallast, balG);
    bMesh.position.set(285, HEX.Z_FLANGE + 25, 0);
  });

  // ==========================================================================
  // 2. 6 ŚCIAN ZE ŚCIĘTYMI WSPORNIKAMI DO 2/3 SZEROKOŚCI RYGLA DOLNEGO
  //    Każda ściana ma 1 długą nogę (na stopie) i 1 krótki słupek (nad ramieniem słupa)
  // ==========================================================================
  const frameW = 455;                   // Szerokość pojedynczej ramy ściany
  const prof = 30;                      // Profil aluminiowy 30x30 mm
  const railSpan = frameW - 2 * prof;   // 395 mm - rozpiętość rygli między słupkami
  const yWallCenter = HEX.R_ALU_C * c30;

  const pirOuterGeo = createHexWallLayerGeo(HEX.R_OUT, HEX.R_ALU_IN, HEX.Z_RAIL - HEX.ZBT, 38);
  const pirInnerContinuousGeo = createHexWallLayerGeo(HEX.R_ALU_IN, HEX.R_PIR_IN, HEX.Z_RAIL - HEX.Z_PIR, 6);
  const plywoodWallGeo = createHexWallLayerGeo(HEX.R_PIR_IN, HEX.R_PLY_IN, HEX.Z_RAIL - HEX.Z_PIR, 6);
  const dibondWallGeo = createHexWallLayerGeo(HEX.R_OUT + 5, HEX.R_OUT + 2, HEX.Z_TOP - HEX.ZB, 2);

  const wallNormalsDeg = [30, 90, 150, 210, 270, 330];

  wallNormalsDeg.forEach(normDeg => {
    const rotY = (normDeg - 90) * Math.PI / 180;
    const wallG = new THREE.Group();
    wallG.rotation.y = rotY;
    hexRootGroup.add(wallG);

    // Rozsunięcie trzyma kolejność od środka: sklejka, PIR, rama ze śrubami, dibond.
    // Ekran z dystansami idzie jeszcze dalej, na zewnątrz poszycia.
    const addLayer = (factor) => {
      const g = new THREE.Group();
      wallG.add(g);
      hexLayerExplosions.push({ group: g, factor, axis: 'z' });
      return g;
    };
    const plyG = addLayer(0.15);
    const insG = addLayer(0.48);
    const frameG = addLayer(1);
    const skinG = addLayer(1.7);
    if (normDeg === 90) hexNorthSkinGroup = skinG;
    hexWallUnitsExplosionList.push(frameG);

    // Wyznaczenie, po której stronie ściany znajduje się wierzchołek ze stopą (60°, 180°, 300°):
    // Dla ścian 30°, 150°, 270° stopa jest po lewej (legSide = -1).
    // Dla ścian 90°, 210°, 330° stopa jest po prawej (legSide = +1).
    const legSide = (normDeg === 30 || normDeg === 150 || normDeg === 270) ? -1 : 1;
    const shortSide = -legSide;

    // A) DŁUGA NOGA (Z = 25..860 mm) - stoi na poszerzonej stopie
    const xLongLeg = legSide * (frameW / 2 - prof / 2); // -212.5 lub +212.5
    const longLegH = HEX.Z_TOP - HEX.Z_WEB;             // 835 mm
    const longLegMesh = addCadMesh(new THREE.BoxGeometry(prof, longLegH, prof), matAluFrame, frameG);
    longLegMesh.position.copy(P3(xLongLeg, yWallCenter, HEX.Z_WEB + longLegH / 2));

    // Trapezowy kątownik stopy z żebrami mocujący długą nogę do ceownika
    addHeavyFootBracket(frameG, xLongLeg, yWallCenter, HEX.Z_WEB, -legSide, prof);

    // B) KRÓTKI SŁUPEK (Z = 185..860 mm) - zawieszony nad ramieniem słupa teleskopu (zero kolizji!)
    const xShortPost = shortSide * (frameW / 2 - prof / 2);
    const shortPostH = HEX.Z_TOP - HEX.ZB;              // 675 mm
    const shortPostMesh = addCadMesh(new THREE.BoxGeometry(prof, shortPostH, prof), matAluFrame, frameG);
    shortPostMesh.position.copy(P3(xShortPost, yWallCenter, HEX.ZB + shortPostH / 2));

    // C) RYGIEL DOLNY (Z = 185..215 mm) I RYGIEL GÓRNY (Z = 830..860 mm)
    const botRail = addCadMesh(new THREE.BoxGeometry(railSpan, prof, prof), matAluFrame, frameG);
    botRail.position.copy(P3(0, yWallCenter, HEX.ZB + prof / 2));

    const topRail = addCadMesh(new THREE.BoxGeometry(railSpan, prof, prof), matAluFrame, frameG);
    topRail.position.copy(P3(0, yWallCenter, HEX.Z_RAIL + prof / 2));

    // D) PRECYZYJNIE ŚCIĘTY ZASTRZAŁ OD DŁUGIEJ NOGI DO 2/3 SZEROKOŚCI RYGLA DOLNEGO
    const xLegInner = xLongLeg - legSide * (prof / 2);           // Wewnętrzna ścianka długiej nogi (±197.5 mm)
    const xTargetTwoThirds = xLegInner - legSide * (railSpan * 0.67); // 2/3 rozpiętości rygla (~265 mm od nogi)
    addMiteredStrutAssembly(frameG, xLegInner, xTargetTwoThirds, 52, HEX.ZB, yWallCenter, legSide);

    // E) WARSTWY IZOLACJI PIR, DYSTANSE G10, SKLEJKA I DIBOND
    const pir1 = addCadMesh(pirOuterGeo, matPirFoam, insG);
    pir1.position.y = HEX.ZBT;
    const pir2 = addCadMesh(pirInnerContinuousGeo, matPirFoam, insG);
    pir2.position.y = HEX.Z_PIR;

    [300, 490, 685].forEach(zSp => {
      [-150, 0, 150].forEach(xOff => {
        const spMesh = addCadMesh(new THREE.BoxGeometry(26, 20, 17.3), matG10Spacer, insG);
        spMesh.position.copy(P3(xOff, 393, zSp));
      });
    });

    const plyMesh = addCadMesh(plywoodWallGeo, matPlywood, plyG);
    plyMesh.position.y = HEX.Z_PIR;

    const dibMesh = addCadMesh(dibondWallGeo, matWhiteDibond, skinG);
    dibMesh.position.y = HEX.ZB;

    // Zaczep klamry dociągowej: na zewnętrznym Dibondzie bazy, poniżej kapinosu fartucha
    // (styk widoczny Z = 825). Luz 4 mm pod krawędzią fartucha — zaczep na poszyciu bazy,
    // nie w strefie dachu. Pomijane w widoku konstrukcji aluminiowej.
    if (document.body.dataset.part !== "konstrukcja" &&
        (normDeg === 30 || normDeg === 90 || normDeg === 150 || normDeg === 330)) {
      const yOut = (HEX.R_OUT + 5) * c30;
      const gapBelow = 4;
      const barH = 8;
      const barTop = ROOF.Z_SKIRT_BOT - gapBelow; // 821
      const barZ = barTop - barH / 2;             // 817
      const plateH = 36;
      const plateZ = barTop - 2 - plateH / 2;      // ~801
      const catchPlate = addCadMesh(new THREE.BoxGeometry(56, plateH, 4), matInoxHardware, skinG);
      catchPlate.userData.isDrawLatch = true;
      catchPlate.position.copy(P3(0, yOut + 2, plateZ));
      const catchBar = addCadMesh(new THREE.BoxGeometry(36, barH, 10), matInoxHardware, skinG);
      catchBar.userData.isDrawLatch = true;
      catchBar.position.copy(P3(0, yOut + 9, barZ));
      [-18, 18].forEach(xOff => {
        const catchBolt = addCadMesh(new THREE.CylinderGeometry(3, 3, 16, 12), matInoxHardware, skinG);
        catchBolt.userData.isDrawLatch = true;
        catchBolt.rotation.x = Math.PI / 2;
        catchBolt.position.copy(P3(xOff, yOut + 1, plateZ));
      });
    }

    // Dwie grzałki 12 V / 15 W na N (90°) i SW (210°) — z dala od BME280 na SE i od wentylatora na S.
    if (normDeg === 90 || normDeg === 210) {
      const heatMesh = addCadMesh(new THREE.BoxGeometry(160, 140, 24), matHeater, plyG);
      heatMesh.position.copy(P3(0, 358, 360));
    }
    if (normDeg === 270) {
      const fanMesh = addCadMesh(new THREE.BoxGeometry(120, 120, 68), matFan, frameG);
      fanMesh.position.copy(P3(0, 404, HEX.Z_TOP - 110));
    }

    // Ekrany Dibond 2 mm na S (270°) i SW (210°). Tulejki PA6/PTFE Ø20×24 + śruby M6 przelotowe.
    // Na S (270°) pomiń punkt (X=0, Z=770) — kolizja z wentylatorem 120×120 (środek Z=750).
    if (normDeg === 270 || normDeg === 210) {
      const snapL = 24, snapR = 10;
      const wallOuterR = HEX.R_OUT + 5;          // lico Dibondu bazy 3 mm
      const screenInR = wallOuterR + snapL;      // 529
      const screenOutR = screenInR + 2;          // 531 — Dibond 2 mm
      const wallAp = wallOuterR * Math.cos(Math.PI / 6);
      const scrInAp = screenInR * Math.cos(Math.PI / 6);
      const standAp = (wallAp + scrInAp) / 2;
      const boltLen = snapL + 18; // przez ekran 2 + tulejkę 24 + Dibond/profil
      const distG = addLayer(2.35);
      hexSolarScreenLayers.push(distG);
      [-210, 0, 210].forEach(xD => {
        [210, 490, 770].forEach(zD => {
          if (normDeg === 270 && xD === 0 && zD === 770) return;
          const sleeve = addCadMesh(new THREE.CylinderGeometry(snapR, snapR, snapL, 20), matSnapSpacer, distG);
          sleeve.rotation.x = Math.PI / 2;
          sleeve.position.copy(P3(xD, standAp, zD));
          const bolt = addCadMesh(new THREE.CylinderGeometry(3, 3, boltLen, 12), matInoxHardware, distG);
          bolt.rotation.x = Math.PI / 2;
          bolt.position.copy(P3(xD, standAp, zD));
          const head = addCadMesh(new THREE.CylinderGeometry(5, 5, 3.5, 6), matInoxHardware, distG);
          head.rotation.x = Math.PI / 2;
          head.position.copy(P3(xD, scrInAp + 4, zD));
        });
      });
      const scrG = addLayer(2.85);
      hexSolarScreenLayers.push(scrG);
      const screenGeo = createHexWallLayerGeo(screenOutR, screenInR, 820 - HEX.ZB, 0);
      const screenMesh = addCadMesh(screenGeo, matSolarScreen, scrG);
      screenMesh.position.y = HEX.ZB;
    }

  });

  // ==========================================================================
  // 3. USZCZELNIENIE I IZOLACJA NAROŻNIKÓW
  //    Czoła sąsiednich słupków dzieli klin: 9 mm od strony komory, 39 mm przy
  //    poszyciu. Płyty PIR i sklejki kończą się na słupkach, więc bez wypełnienia
  //    narożnik jest mostkiem powietrznym. Klin PIR i taśmy EPDM zamykają go na
  //    całej wysokości komory (Z = 277–860). Geometria w układzie dwusiecznej.
  // ==========================================================================
  const sealT = 4;
  const cos60 = Math.cos(Math.PI / 3), sin60 = Math.sin(Math.PI / 3);
  const yProfC = HEX.R_ALU_C * Math.cos(Math.PI / 6);
  const xPostFace = 227.5;
  const postFacePt = (yoff) => {
    const Y = yProfC + yoff;
    return [xPostFace * cos60 + Y * sin60, xPostFace * sin60 - Y * cos60];
  };
  const faceCin = postFacePt(-15), faceCout = postFacePt(15);
  const faceDx = faceCout[0] - faceCin[0], faceDz = faceCout[1] - faceCin[1];
  const faceLen = Math.hypot(faceDx, faceDz);
  const gapNx = -faceDz / faceLen, gapNz = faceDx / faceLen;
  const faceIn0 = [faceCin[0] + gapNx * sealT, faceCin[1] + gapNz * sealT];
  const faceIn1 = [faceCout[0] + gapNx * sealT, faceCout[1] + gapNz * sealT];
  const mirrorZ = (p) => [p[0], -p[1]];

  const rInnerFace = HEX.R_PLY_IN;
  const lapZ = 7;
  const xLapCorner = rInnerFace - lapZ / Math.sqrt(3);
  const cornerPlugPts = [
    [rInnerFace, 0],
    [xLapCorner, -lapZ],
    [462, -6],
    faceIn0,
    faceIn1,
    [HEX.R_OUT, -2],
    [HEX.R_OUT, 2],
    mirrorZ(faceIn1),
    mirrorZ(faceIn0),
    [462, 6],
    [xLapCorner, lapZ]
  ];

  const sealH = HEX.Z_TOP - HEX.Z_PIR;
  const extrudeCornerProfile = (pts) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k][0], -pts[k][1]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: sealH, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  };

  const cornerPlugGeo = extrudeCornerProfile(cornerPlugPts);
  const cornerGasketGeo = extrudeCornerProfile([faceCin, faceCout, faceIn1, faceIn0]);
  const cornerGasketGeoM = extrudeCornerProfile([mirrorZ(faceCin), mirrorZ(faceCout), mirrorZ(faceIn1), mirrorZ(faceIn0)]);
  const cornerSeamGeo = extrudeCornerProfile([
    [HEX.R_OUT, -2], [HEX.R_OUT + 5, -1.6], [HEX.R_OUT + 5, 1.6], [HEX.R_OUT, 2]
  ]);

  // ==========================================================================
  // 4. KLAMRY NAROŻNE 120° SKRĘCAJĄCE SĄSIEDNIE ŚCIANY
  //    W narożnikach ze stopą (60°, 180°, 300°) dodatkowa dolna klamra na Z=115 mm
  // ==========================================================================
  for (let i = 0; i < 6; i++) {
    const deg = i * 60;
    const isFootVertex = (deg === 60 || deg === 180 || deg === 300);
    const cornerG = new THREE.Group();
    cornerG.rotation.y = deg * Math.PI / 180;
    hexRootGroup.add(cornerG);

    // Śruby jadą z ramą, ale po dwusiecznej, więc zostają na wewnętrznym licu słupków.
    const clampG = new THREE.Group();
    cornerG.add(clampG);
    hexLayerExplosions.push({ group: clampG, factor: 1 / c30, axis: 'x' });
    const sealG = new THREE.Group();
    cornerG.add(sealG);
    hexLayerExplosions.push({ group: sealG, factor: 0.48 / c30, axis: 'x' });
    const seamG = new THREE.Group();
    cornerG.add(seamG);
    hexLayerExplosions.push({ group: seamG, factor: 1.7 / c30, axis: 'x' });

    const clampLevels = isFootVertex ? [115, 225, 520, 795] : [225, 520, 795];
    clampLevels.forEach(zClamp => {
      const wingL = addCadMesh(new THREE.BoxGeometry(6, 48, 46), matInoxHardware, clampG);
      wingL.position.set(HEX.R_ALU_IN - 10, zClamp, -19);
      wingL.rotation.y = Math.PI / 6;

      const wingR = addCadMesh(new THREE.BoxGeometry(6, 48, 46), matInoxHardware, clampG);
      wingR.position.set(HEX.R_ALU_IN - 10, zClamp, 19);
      wingR.rotation.y = -Math.PI / 6;

      [-21, 21].forEach(zB => {
        const cBolt = addCadMesh(new THREE.CylinderGeometry(4.5, 4.5, 36, 16), matInoxHardware, clampG);
        cBolt.rotation.z = Math.PI / 2;
        cBolt.position.set(HEX.R_ALU_IN + 4, zClamp, zB);
      });
    });

    const cornerPlug = addCadMesh(cornerPlugGeo, matPirFoam, sealG);
    cornerPlug.position.y = HEX.Z_PIR;
    const cornerGasket = addCadMesh(cornerGasketGeo, matEpdmSeal, sealG);
    cornerGasket.position.y = HEX.Z_PIR;
    const cornerGasketM = addCadMesh(cornerGasketGeoM, matEpdmSeal, sealG);
    cornerGasketM.position.y = HEX.Z_PIR;
    const cornerSeam = addCadMesh(cornerSeamGeo, matEpdmSeal, seamG);
    cornerSeam.position.y = HEX.Z_PIR;
  }

  // Podłoga nośna: blacha Al 5 mm (nie sklejka) — 1× LiFePO4 100 Ah ~12 kg bez ugięć.
  buildHexSplitFloor(hexRootGroup, HEX.ZBT, 5, HEX.R_ALU_IN, HEX.HOLE_R, matAluFrame);
  buildHexSplitFloor(hexRootGroup, HEX.Z_PLY, HEX.Z_PIR - HEX.Z_PLY, HEX.R_PIR_IN, HEX.HOLE_R, matPirFoam);

  const collarMesh = addCadMesh(createHollowCylinderGeo(HEX.HOLE_R, HEX.SEAL_IN_R, 62, 64), matArmaflex, hexRootGroup);
  collarMesh.position.set(0, HEX.ZBT + 31, 0);

  buildEquipmentVerificationGroup();
  buildElectricalLayout();
}

function buildElectricalLayout() {
  const aIn = HEX.R_PLY_IN * Math.cos(Math.PI / 6);
  const aOut = (HEX.R_OUT + 5) * Math.cos(Math.PI / 6);
  const floorTop = HEX.Z_PIR;

  const din = addCadMesh(new THREE.BoxGeometry(160, 190, 80), matDinBox, hexRootGroup);
  din.position.copy(P3(0, aIn - 55, 560));

  const psuAstro = addCadMesh(new THREE.BoxGeometry(90, 40, 70), matBlackSteel, hexRootGroup);
  psuAstro.position.copy(P3(155, aIn - 55, 520));
  const psuCam = addCadMesh(new THREE.BoxGeometry(90, 40, 70), matBlackSteel, hexRootGroup);
  psuCam.position.copy(P3(155, aIn - 55, 590));

  // 1× LiFePO4 12,8 V 100 Ah (DIN L3/H6: 278×175×190), self-heating + Bluetooth.
  // Południe podłogi: dłuższy bok wschód–zachód, luz od otuliny słupa ~66 mm, od ściany S ~65 mm.
  // Podkładka Al 290×185×2 klejona do PIR (bez śrub przez podłogę).
  const batL = 278, batW = 175, batH = 190;
  const padH = 2;
  const batX = 0, batY = -230;
  const pad = addCadMesh(new THREE.BoxGeometry(290, padH, 185), matAluFrame, hexRootGroup);
  pad.position.copy(P3(batX, batY, floorTop + padH / 2));
  const bat = addCadMesh(new THREE.BoxGeometry(batL, batH, batW), matBattery, hexRootGroup);
  bat.position.copy(P3(batX, batY, floorTop + padH + batH / 2));
  // Zaciski M8 na górnej ściance (symbolicznie, przy wschodnim końcu).
  const termP = addCadMesh(new THREE.CylinderGeometry(5, 5, 12, 16), matInoxHardware, hexRootGroup);
  termP.position.copy(P3(batX + 95, batY + 40, floorTop + padH + batH + 6));
  const termN = addCadMesh(new THREE.CylinderGeometry(5, 5, 12, 16), matInoxHardware, hexRootGroup);
  termN.position.copy(P3(batX + 95, batY - 40, floorTop + padH + batH + 6));
  // DS18B20 na obudowie akumulatora (sterowanie grzałkami).
  const batProbe = addCadMesh(new THREE.BoxGeometry(28, 16, 18), matSensor, hexRootGroup);
  batProbe.position.copy(P3(batX - 100, batY + 88, floorTop + padH + 90));

  // Victron SmartSolar MPPT 100/30 na ścianie N, na zachód od rozdzielnicy (kabel PV z przepustu pod talerzem).
  const mppt = addCadMesh(new THREE.BoxGeometry(130, 186, 70), matCharger, hexRootGroup);
  mppt.position.copy(P3(-110, aIn - 40, 400));

  // Czujnik, Pi i przekaźnik na ścianie SE — z dala od grzałek N/W.
  const climateG = new THREE.Group();
  climateG.rotation.y = (330 - 90) * Math.PI / 180;
  hexRootGroup.add(climateG);
  const sensor = addCadMesh(new THREE.BoxGeometry(28, 16, 18), matSensor, climateG);
  sensor.position.copy(P3(100, aIn - 24, 560));
  const pi = addCadMesh(new THREE.BoxGeometry(65, 16, 30), matPiBoard, climateG);
  pi.position.copy(P3(-95, aIn - 28, 500));
  const relay = addCadMesh(new THREE.BoxGeometry(55, 18, 40), matEpdmSeal, climateG);
  relay.position.copy(P3(-95, aIn - 30, 548));

  // Ubiquiti U7-Pro-XG centralnie na ścianie północnej. Okap, hak i antena w osi X = 0.
  // Trzy przepusty pod talerzem: 230 V, Ethernet, PV ze stojaka zewnętrznego.
  const dishR = 103;
  const dishT = 32.5;
  const zDish = 545;
  const yFace = aOut;
  const wifiG = new THREE.Group();
  (hexNorthSkinGroup || hexRootGroup).add(wifiG);

  const stand = addCadMesh(new THREE.CylinderGeometry(18, 18, 14, 20), matAluFrame, wifiG);
  stand.rotation.x = Math.PI / 2;
  stand.position.copy(P3(0, yFace + 7, zDish));
  const dish = addCadMesh(new THREE.CylinderGeometry(dishR, dishR, dishT, 48), matDish, wifiG);
  dish.rotation.x = Math.PI / 2;
  dish.position.copy(P3(0, yFace + 8 + dishT / 2, zDish));

  const slope = 100;
  const ang = 60 * Math.PI / 180;
  const lipZ = zDish + dishR + 22;
  const mountZ = lipZ + slope * Math.sin(ang);
  const hood = addCadMesh(new THREE.BoxGeometry(280, 3, slope), matWhiteDibond, wifiG);
  hood.rotation.x = Math.PI * 2 / 3;
  hood.position.set(0, mountZ - (slope / 2) * Math.sin(ang), -(yFace + (slope / 2) * Math.cos(ang)));

  const hookY = yFace + 24;
  const hookZ = mountZ - 48;
  const stem = addCadMesh(new THREE.CylinderGeometry(3, 3, 26, 10), matInoxHardware, wifiG);
  stem.position.copy(P3(0, hookY, hookZ - 8));
  const bow = addCadMesh(new THREE.TorusGeometry(9, 2.4, 8, 18, Math.PI * 1.35), matInoxHardware, wifiG);
  bow.rotation.y = Math.PI / 2;
  bow.position.copy(P3(0, hookY, hookZ - 24));

  const wallDepth = aOut - aIn + 8;
  const zCableRow = zDish - dishR - 28;
  [
    { x: -28, z: zCableRow, r: 8, stub: 4.2 },   // Ø16 — 230 V
    { x: 28, z: zCableRow, r: 6, stub: 3.2 },    // Ø12 — Ethernet
    { x: 0, z: zCableRow - 26, r: 8, stub: 4.2 } // Ø16 — PV (panel bifacial 450 W)
  ].forEach(hole => {
    const bush = addCadMesh(new THREE.CylinderGeometry(hole.r, hole.r, wallDepth, 20), matEpdmSeal, wifiG);
    bush.rotation.x = Math.PI / 2;
    bush.position.copy(P3(hole.x, (aOut + aIn) / 2, hole.z));
    const outStub = addCadMesh(new THREE.CylinderGeometry(hole.stub, hole.stub, 18, 12), matEpdmSeal, wifiG);
    outStub.rotation.x = Math.PI / 2;
    outStub.position.copy(P3(hole.x, yFace + 12, hole.z));
    const inStub = addCadMesh(new THREE.CylinderGeometry(hole.stub, hole.stub, 18, 12), matEpdmSeal, wifiG);
    inStub.rotation.x = Math.PI / 2;
    inStub.position.copy(P3(hole.x, aIn - 10, hole.z));
  });

  const injector = addCadMesh(new THREE.BoxGeometry(80, 40, 28), matBlackSteel, hexRootGroup);
  injector.position.copy(P3(-130, aIn - 36, 500));
}

function buildHexSplitFloor(parent, zBottom, thickness, outerR, holeR, material) {
  const c30 = Math.cos(Math.PI / 6);
  const a = outerR * c30, hSide = outerR * 0.5, gap = 2;

  const northShape = new THREE.Shape();
  northShape.moveTo(holeR, gap); northShape.lineTo(outerR, gap); northShape.lineTo(hSide, a);
  northShape.lineTo(-hSide, a); northShape.lineTo(-outerR, gap); northShape.lineTo(-holeR, gap);
  northShape.absarc(0, 0, holeR, Math.PI - 0.02, 0.02, true);
  const northGeo = new THREE.ExtrudeGeometry(northShape, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  northGeo.rotateX(-Math.PI / 2);
  const northMesh = addCadMesh(northGeo, material, parent);
  northMesh.position.set(0, zBottom, 0);

  const southShape = new THREE.Shape();
  southShape.moveTo(-holeR, -gap); southShape.lineTo(-outerR, -gap); southShape.lineTo(-hSide, -a);
  southShape.lineTo(hSide, -a); southShape.lineTo(outerR, -gap); southShape.lineTo(holeR, -gap);
  southShape.absarc(0, 0, holeR, -0.02, -Math.PI + 0.02, true);
  const southGeo = new THREE.ExtrudeGeometry(southShape, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  southGeo.rotateX(-Math.PI / 2);
  const southMesh = addCadMesh(southGeo, material, parent);
  southMesh.position.set(0, zBottom, 0);
}

function buildEquipmentVerificationGroup() {
  equipEnvelopeGroup = new THREE.Group();
  scene.add(equipEnvelopeGroup);

  const Z0 = 910;
  const lat = 52 * Math.PI / 180;

  const base = addCadMesh(new THREE.CylinderGeometry(61, 61, 64, 48), matEquipBody, equipEnvelopeGroup);
  base.position.set(0, Z0 + 32, 0);

  const raGroup = new THREE.Group();
  raGroup.position.set(0, Z0 + 64, 0);
  raGroup.rotation.x = -(Math.PI / 2 - lat);
  equipEnvelopeGroup.add(raGroup);

  const raBody = addCadMesh(new THREE.CylinderGeometry(30, 30, 108, 32), matEquipBody, raGroup);
  raBody.position.set(0, 54, 0);

  otaPivotGroup = new THREE.Group();
  otaPivotGroup.position.set(0, 100, 75);
  otaPivotGroup.rotation.set(0, 0, isParkedPose ? Math.PI / 2 : 0);
  raGroup.add(otaPivotGroup);

  const dec = addCadMesh(new THREE.CylinderGeometry(45, 45, 94, 40), matEquipBody, otaPivotGroup);
  dec.rotation.z = Math.PI / 2;

  const saddle = addCadMesh(new THREE.BoxGeometry(38, 125, 16), matEquipBody, otaPivotGroup);
  saddle.position.set(0, 0, 53);

  const ota = new THREE.Group();
  ota.position.set(0, 0, 113);
  otaPivotGroup.add(ota);

  const L = 365, dewLen = 110, rearLen = 58, mainLen = L - dewLen - rearLen;
  const dew = addCadMesh(new THREE.CylinderGeometry(46, 46, dewLen, 40), matEquipRedCat, ota);
  dew.position.y = L / 2 - dewLen / 2;
  const main = addCadMesh(new THREE.CylinderGeometry(40, 40, mainLen, 40), matEquipRedCat, ota);
  main.position.y = L / 2 - dewLen - mainLen / 2;
  const rearTube = addCadMesh(new THREE.CylinderGeometry(33, 33, rearLen, 32), matBlackSteel, ota);
  rearTube.position.y = -L / 2 + rearLen / 2;
  const knob = addCadMesh(new THREE.CylinderGeometry(14, 14, 22, 24), matBlackSteel, ota);
  knob.rotation.z = Math.PI / 2;
  knob.position.set(52, L / 2 - dewLen - 30, 0);

  const dovetail = addCadMesh(new THREE.BoxGeometry(38, 210, 12), matEquipBody, ota);
  dovetail.position.set(0, -40, -46);

  const gs = new THREE.Group();
  gs.position.set(0, 20, 72);
  ota.add(gs);
  addCadMesh(new THREE.CylinderGeometry(22, 22, 123, 28), matBlackSteel, gs);
  const cell = addCadMesh(new THREE.CylinderGeometry(26, 26, 16, 28), matBlackSteel, gs);
  cell.position.y = 123 / 2 - 8;
  const shoe = addCadMesh(new THREE.BoxGeometry(16, 70, 10), matEquipBody, gs);
  shoe.position.set(0, -10, -27);
  const gcam = addCadMesh(new THREE.CylinderGeometry(18, 18, 61, 28), matEquipBody, gs);
  gcam.position.y = -123 / 2 - 61 / 2 + 18;

  const rear = -L / 2;
  const efw = addCadMesh(new THREE.BoxGeometry(177.5, 30, 167), matBlackSteel, ota);
  efw.position.set(0, rear - 15, 0);
  const wheel = addCadMesh(new THREE.CylinderGeometry(75.4, 75.4, 20, 48), matEquipBody, ota);
  wheel.position.set(0, rear - 15, 0);
  const cam = addCadMesh(new THREE.CylinderGeometry(45, 45, 97, 40), matBlackSteel, ota);
  cam.position.set(0, rear - 37.5 - 97 / 2, 0);
}

function buildRadialArm60x40x3(parent) {
  const startX = 35, endX = PARAMS.ARM, length = endX - startX, W = PARAMS.PW * 2, H = PARAMS.PH, T = PARAMS.PT;
  const createHorizWall = (zBottom) => {
    const shape = new THREE.Shape();
    shape.moveTo(startX, -PARAMS.PW); shape.lineTo(endX, -PARAMS.PW);
    shape.lineTo(endX, PARAMS.PW); shape.lineTo(startX, PARAMS.PW); shape.closePath();
    const hSleeve = new THREE.Path(); hSleeve.absarc(PARAMS.FC, 0, 13, 0, Math.PI * 2, true); shape.holes.push(hSleeve);
    const hBolt = new THREE.Path(); hBolt.absarc(PARAMS.BRAD, 0, 6.5, 0, Math.PI * 2, true); shape.holes.push(hBolt);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    const mesh = addCadMesh(geo, matBlackSteel, parent);
    mesh.position.set(0, zBottom, 0);
  };
  createHorizWall(0);
  createHorizWall(H - T);
  const sideH = H - 2 * T;
  const sideGeo = new THREE.BoxGeometry(length, sideH, T);
  const side1 = addCadMesh(sideGeo, matBlackSteel, parent);
  side1.position.copy(toThreePos((startX + endX) / 2, -PARAMS.PW + T / 2, H / 2));
  const side2 = addCadMesh(sideGeo, matBlackSteel, parent);
  side2.position.copy(toThreePos((startX + endX) / 2, PARAMS.PW - T / 2, H / 2));
  const cap = addCadMesh(new THREE.BoxGeometry(T, sideH, W - 2 * T), matBlackSteel, parent);
  cap.position.copy(toThreePos(endX - T / 2, 0, H / 2));
}

function buildFootAssemblyM16(parent) {
  const fx = PARAMS.FC;
  const plateMesh = addCadMesh(new THREE.BoxGeometry(100, 6, 100), matBlackSteel, parent);
  plateMesh.position.copy(toThreePos(fx, 0, -77));
  const socketRingMesh = addCadMesh(createHollowCylinderGeometry(14, 8.2, 3, 32), matBlackSteel, parent);
  socketRingMesh.position.copy(toThreePos(fx, 0, -72.5));
  const ballMesh = addCadMesh(new THREE.SphereGeometry(8.0, 28, 20), matSilverInox, parent);
  ballMesh.position.copy(toThreePos(fx, 0, -71));
  const screwMesh = addCadMesh(new THREE.CylinderGeometry(8, 8, 131, 36), matSilverThread, parent);
  screwMesh.position.copy(toThreePos(fx, 0, -5.5));
  const hexHeadMesh = addCadMesh(createHexPrismGeometry(13.8, 10), matSilverInox, parent);
  hexHeadMesh.position.copy(toThreePos(fx, 0, 60));
  const sleeveMesh = addCadMesh(createHollowCylinderGeometry(13, 8, 40, 36), matBlackSteel, parent);
  sleeveMesh.position.copy(toThreePos(fx, 0, 20));
  const washerMesh = addCadMesh(createHollowCylinderGeometry(15, 8.2, 2.5, 32), matSilverInox, parent);
  washerMesh.position.copy(toThreePos(fx, 0, 41.25));
  const lockNutMesh = addCadMesh(createHexNutGeometry(13.8, 8, 9), matSilverInox, parent);
  lockNutMesh.position.copy(toThreePos(fx, 0, 42.5));
}

function buildPierModel() {
  const lift = new THREE.Group();
  lift.position.y = 80;
  pierLiftGroup = lift;
  scene.add(lift);
  const rootGroup = new THREE.Group();
  lift.add(rootGroup);
  pierBallastGroup = new THREE.Group();
  rootGroup.add(pierBallastGroup);

  ARM_ANGLES.forEach(ang => {
    const armGroup = new THREE.Group();
    armGroup.rotation.y = ang;
    rootGroup.add(armGroup);
    buildRadialArm60x40x3(armGroup);
    buildFootAssemblyM16(armGroup);

    const balArm = new THREE.Group();
    balArm.rotation.y = ang;
    pierBallastGroup.add(balArm);
    const bal = addCadMesh(new THREE.BoxGeometry(300, 50, 300), matBallast, balArm);
    bal.position.set(285, 65, 0);
  });

  const coreMesh = addCadMesh(createHollowCylinderGeometry(52, 18, PARAMS.PH, 36), matBlackSteel, rootGroup);
  coreMesh.position.set(0, PARAMS.PH / 2, 0);

  const basePlateShape = new THREE.Shape();
  basePlateShape.absarc(0, 0, PARAMS.PRAD, 0, Math.PI * 2, false);
  ARM_ANGLES.forEach(ang => {
    const holePath = new THREE.Path();
    holePath.absarc(PARAMS.BRAD * Math.cos(ang), PARAMS.BRAD * Math.sin(ang), 6.5, 0, Math.PI * 2, true);
    basePlateShape.holes.push(holePath);
  });
  const basePlateGeo = new THREE.ExtrudeGeometry(basePlateShape, { depth: 10, bevelEnabled: false, curveSegments: 64 });
  basePlateGeo.rotateX(-Math.PI / 2);
  const basePlateMesh = addCadMesh(basePlateGeo, matBlackSteel, rootGroup);
  basePlateMesh.position.set(0, 40, 0);

  ARM_ANGLES.forEach(ang => {
    const bx = PARAMS.BRAD * Math.cos(ang), by = PARAMS.BRAD * Math.sin(ang);
    const shankMesh = addCadMesh(new THREE.CylinderGeometry(6, 6, 54, 32), matSilverThread, rootGroup);
    shankMesh.position.copy(toThreePos(bx, by, 23));
    const cskMesh = addCadMesh(new THREE.CylinderGeometry(9.5, 6, 5.5, 32), matSilverInox, rootGroup);
    cskMesh.position.copy(toThreePos(bx, by, 50 - 2.75 + 0.05));
    const nutBotMesh = addCadMesh(createHexNutGeometry(10, 6, 10), matSilverInox, rootGroup);
    nutBotMesh.position.copy(toThreePos(bx, by, -14));
  });

  const pipeMesh = addCadMesh(createHollowCylinderGeometry(PARAMS.TR, PARAMS.TRI, PARAMS.TL, 64), matBlackSteel, rootGroup);
  pipeMesh.position.set(0, PARAMS.ZT + PARAMS.TL / 2, 0);

  const sandMesh = addCadMesh(new THREE.CylinderGeometry(PARAMS.TRI - 0.3, PARAMS.TRI - 0.3, 290, 48), matQuartzSand, rootGroup);
  sandMesh.position.set(0, 50 + 290 / 2, 0);
  const foamMesh = addCadMesh(new THREE.CylinderGeometry(PARAMS.TRI - 0.3, PARAMS.TRI - 0.3, 60, 48), matPurFoam, rootGroup);
  foamMesh.position.set(0, 340 + 60 / 2, 0);

  armaflexMesh = addCadMesh(createHollowCylinderGeometry(PARAMS.TR + PARAMS.ARMA_T, PARAMS.TR + 0.1, PARAMS.TL, 64), matArmaflex, rootGroup);
  armaflexMesh.position.set(0, PARAMS.ZT + PARAMS.TL / 2, 0);

  const flangeShape = new THREE.Shape();
  flangeShape.absarc(0, 0, PARAMS.FLR, 0, Math.PI * 2, false);
  ARM_ANGLES.forEach(a => {
    const h = new THREE.Path();
    h.absarc(PARAMS.M6R * Math.cos(a), PARAMS.M6R * Math.sin(a), 3.0, 0, Math.PI * 2, true);
    flangeShape.holes.push(h);
  });
  const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, { depth: 12, bevelEnabled: false, curveSegments: 64 });
  flangeGeo.rotateX(-Math.PI / 2);
  const flangeMesh = addCadMesh(flangeGeo, matBlackSteel, rootGroup);
  flangeMesh.position.set(0, PARAMS.ZTOP, 0);

  g10SpacerGroup = new THREE.Group();
  rootGroup.add(g10SpacerGroup);
  const g10Shape = new THREE.Shape();
  g10Shape.absarc(0, 0, PARAMS.DR, 0, Math.PI * 2, false);
  ARM_ANGLES.forEach(a => {
    const h = new THREE.Path();
    h.absarc(PARAMS.M6R * Math.cos(a), PARAMS.M6R * Math.sin(a), 3.2, 0, Math.PI * 2, true);
    g10Shape.holes.push(h);
  });
  const g10Geo = new THREE.ExtrudeGeometry(g10Shape, { depth: PARAMS.G10_T, bevelEnabled: false, curveSegments: 64 });
  g10Geo.rotateX(-Math.PI / 2);
  const g10Mesh = addCadMesh(g10Geo, matG10Spacer, g10SpacerGroup);
  g10Mesh.position.set(0, PARAMS.ZFL, 0);

  extensionGroup = new THREE.Group();
  rootGroup.add(extensionGroup);

  const lowerDiscBotShape = new THREE.Shape();
  lowerDiscBotShape.absarc(0, 0, PARAMS.DR, 0, Math.PI * 2, false);
  ARM_ANGLES.forEach(a => {
    const h = new THREE.Path();
    h.absarc(PARAMS.M6R * Math.cos(a), PARAMS.M6R * Math.sin(a), 3.2, 0, Math.PI * 2, true);
    lowerDiscBotShape.holes.push(h);
  });
  const lowerDiscBotGeo = new THREE.ExtrudeGeometry(lowerDiscBotShape, { depth: 8, bevelEnabled: false, curveSegments: 64 });
  lowerDiscBotGeo.rotateX(-Math.PI / 2);
  const lowerDiscBotMesh = addCadMesh(lowerDiscBotGeo, matSilverAlum, extensionGroup);
  lowerDiscBotMesh.position.set(0, PARAMS.ZG10, 0);

  const lowerDiscTopShape = new THREE.Shape();
  lowerDiscTopShape.absarc(0, 0, PARAMS.DR, 0, Math.PI * 2, false);
  ARM_ANGLES.forEach(a => {
    const h = new THREE.Path();
    h.absarc(PARAMS.M6R * Math.cos(a), PARAMS.M6R * Math.sin(a), 6.0, 0, Math.PI * 2, true);
    lowerDiscTopShape.holes.push(h);
  });
  const lowerDiscTopGeo = new THREE.ExtrudeGeometry(lowerDiscTopShape, { depth: 4, bevelEnabled: false, curveSegments: 64 });
  lowerDiscTopGeo.rotateX(-Math.PI / 2);
  const lowerDiscTopMesh = addCadMesh(lowerDiscTopGeo, matSilverAlum, extensionGroup);
  lowerDiscTopMesh.position.set(0, PARAMS.ZG10 + 8, 0);

  m6ScrewsGroup = new THREE.Group();
  extensionGroup.add(m6ScrewsGroup);
  ARM_ANGLES.forEach(a => {
    const mx = PARAMS.M6R * Math.cos(a), my = PARAMS.M6R * Math.sin(a);
    // M6×35: łeb + trzpień przez dysk 12 mm + G10 10 mm + ~13 mm w kołnierz stalowy
    const m6HeadMesh = addCadMesh(new THREE.CylinderGeometry(6.0, 6.0, 4, 32), matSilverInox, m6ScrewsGroup);
    m6HeadMesh.position.copy(toThreePos(mx, my, PARAMS.ZG10 + 10));
    const m6ShankMesh = addCadMesh(new THREE.CylinderGeometry(2.8, 2.8, 32, 32), matSilverThread, m6ScrewsGroup);
    m6ShankMesh.position.copy(toThreePos(mx, my, PARAMS.ZTOP + 1 + 16));
  });

  extensionUpperSubGroup = new THREE.Group();
  extensionGroup.add(extensionUpperSubGroup);
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    const rodMesh = addCadMesh(new THREE.CylinderGeometry(PARAMS.ROD_R, PARAMS.ROD_R, PARAMS.ROD_H, 36), matSilverAlum, extensionUpperSubGroup);
    rodMesh.position.copy(toThreePos(PARAMS.ROD_PCD_R * Math.cos(ang), PARAMS.ROD_PCD_R * Math.sin(ang), PARAMS.ZG10 + PARAMS.DT + PARAMS.ROD_H / 2));
  }
  const zDisc = PARAMS.ZG10 + PARAMS.DT + PARAMS.ROD_H;
  const upperDiscMesh = addCadMesh(createHollowCylinderGeometry(PARAMS.DR, PARAMS.BOSS_HOLE_R, PARAMS.DT, 64), matSilverAlum, extensionUpperSubGroup);
  upperDiscMesh.position.set(0, zDisc + PARAMS.DT / 2, 0);
  const bossMesh = addCadMesh(createHollowCylinderGeometry(PARAMS.BOSS_R, PARAMS.BOSS_HOLE_R, PARAMS.BOSS_H, 64), matSilverAlum, extensionUpperSubGroup);
  bossMesh.position.set(0, zDisc + PARAMS.DT + PARAMS.BOSS_H / 2, 0);
}

function createFullHexPlateGeo(radius, thickness, holeRadius = 0) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * 60) * Math.PI / 180;
    const x = radius * Math.cos(a), y = radius * Math.sin(a);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  if (holeRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function createSlopedRoofTriangleGeo(rEave, rTopHole, zEave, zPeak, thickness) {
  const c30 = Math.cos(Math.PI / 6);
  const aEave = rEave * c30, halfBase = rEave * 0.5;
  const aTop = rTopHole * c30, halfTop = rTopHole * 0.5;
  const dy = aEave - aTop, dz = zPeak - zEave;
  const len = Math.sqrt(dy * dy + dz * dz);
  const ny = dz / len, nz = dy / len;
  const ty = thickness * ny, tz = thickness * nz;
  const p0 = [-halfBase, zEave, -aEave], p1 = [halfBase, zEave, -aEave];
  const p2 = [halfTop, zPeak, -aTop], p3 = [-halfTop, zPeak, -aTop];
  const q0 = [p0[0], p0[1] + tz, p0[2] - ty], q1 = [p1[0], p1[1] + tz, p1[2] - ty];
  const q2 = [p2[0], p2[1] + tz, p2[2] - ty], q3 = [p3[0], p3[1] + tz, p3[2] - ty];
  const vertices = [];
  const pushTri = (a, b, c) => vertices.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  const pushQuad = (a, b, c, d) => { pushTri(a, b, c); pushTri(a, c, d); };
  pushQuad(q0, q1, q2, q3);
  pushQuad(p3, p2, p1, p0);
  pushQuad(p0, p1, q1, q0);
  pushQuad(p1, p2, q2, q1);
  pushQuad(p2, p3, q3, q2);
  pushQuad(p3, p0, q0, q3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildRoofModel() {
  roofMasterGroup = new THREE.Group();
  scene.add(roofMasterGroup);

  roofWallsGroup = new THREE.Group();
  roofMasterGroup.add(roofWallsGroup);
  roofScreensGroup = null; // ekrany pod wG → roofSolarScreenLayers (jak hexSolarScreenLayers)

  roofCeilingPirGroup = new THREE.Group();
  roofMasterGroup.add(roofCeilingPirGroup);

  roofRaftersGroup = new THREE.Group();
  roofMasterGroup.add(roofRaftersGroup);

  roofTropikSlopesGroup = new THREE.Group();
  roofMasterGroup.add(roofTropikSlopesGroup);

  roofWallPanelsExplosionList = [];
  roofLayerExplosions = [];
  roofSolarScreenLayers = [];

  const wallNormalsDeg = [30, 90, 150, 210, 270, 330];
  const c30 = Math.cos(Math.PI / 6);

  // Wymiary pojedynczej prefabrykowanej ramy prostokątnej (profil Alu 30×30×1,5 mm)
  const frameW = 455;                 // Szerokość ramy (mieści się w trapezie ściany bez kolizji w narożach)
  const prof = 30;                    // Przekrój zewnętrzny profilu 30×30 (ścianka 1,5 mm — masa)
  const frameZBot = ROOF.Z_EPDM_TOP;  // 872 mm
  const frameZTop = ROOF.Z_WALL_TOP;  // 1200 mm
  const frameH = frameZTop - frameZBot; // 328 mm całkowitej wysokości ramy
  const innerPostH = frameH - 2 * prof; // 268 mm - słupek pionowy między ryglem dolnym a górnym
  const yFrameCenter = (ROOF.R_ALU_C * c30); // ~418 mm od osi do środka profilu ramy

  // Warstwy wypełnienia i poszycia pojedynczej kasety ściennej (klejone 2K)
  const epdmSealGeo = createHexWallLayerGeo(ROOF.R_OUT, ROOF.R_ALU_IN, 12, 12);
  const pirWallOuterGeo = createHexWallLayerGeo(ROOF.R_OUT, ROOF.R_ALU_IN, frameH - 2 * prof, 38);
  const pirWallInnerLabGeo = createHexWallLayerGeo(ROOF.R_ALU_IN, ROOF.R_PIR_IN, frameZTop - 6 - ROOF.Z_PLUG_BOT, 8);
  const plyWallInnerGeo = createHexWallLayerGeo(ROOF.R_PIR_IN, ROOF.R_PLY_IN, 1188 - 865, 8); // Dibond 2 mm (wklejany 2K)
  const dibondSkirtWallGeo = createHexWallLayerGeo(ROOF.R_SKIRT_OUT, ROOF.R_SKIRT_OUT - 2, frameZTop - ROOF.Z_SKIRT_BOT, 2); // fartuch Dibond 2 mm
  const skirtSpacerGeo = createHexWallLayerGeo(ROOF.R_SKIRT_OUT - 2, ROOF.R_OUT, frameH, 12);

  // 1. BUDOWA 6 OSOBNYCH KASET ŚCIENNYCH (KLEJONYCH 2K W WARSZTACIE, SKRĘCANYCH NA DACHU)
  wallNormalsDeg.forEach(normDeg => {
    const rotY = (normDeg - 90) * Math.PI / 180;
    const wG = new THREE.Group();
    wG.rotation.y = rotY;
    roofWallsGroup.add(wG);

    const panelUnitG = new THREE.Group();
    wG.add(panelUnitG);
    roofWallPanelsExplosionList.push(panelUnitG);

    const epdmMesh = addCadMesh(epdmSealGeo, matEpdmSeal, panelUnitG);
    epdmMesh.position.y = ROOF.Z_SPLIT;

    // --- PROSTOKĄTNA RAMA Z PROFILI ALU 30x30x1.5 ---
    const botRail = addCadMesh(new THREE.BoxGeometry(frameW, prof, prof), matAluFrame, panelUnitG);
    botRail.position.copy(P3(0, yFrameCenter, frameZBot + prof / 2));

    const topRail = addCadMesh(new THREE.BoxGeometry(frameW, prof, prof), matAluFrame, panelUnitG);
    topRail.position.copy(P3(0, yFrameCenter, frameZTop - prof / 2));

    [-1, 1].forEach(side => {
      const xPost = side * (frameW / 2 - prof / 2);
      const vertPost = addCadMesh(new THREE.BoxGeometry(prof, innerPostH, prof), matAluFrame, panelUnitG);
      vertPost.position.copy(P3(xPost, yFrameCenter, frameZBot + prof + innerPostH / 2));

      // Śruby M6 w nitonakrętkach do skręcenia z kątownikiem narożnym 120°
      [frameZBot + 75, frameZTop - 75].forEach(zBolt => {
        const bolt = addCadMesh(new THREE.CylinderGeometry(3, 3, 34, 16), matInoxHardware, panelUnitG);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.copy(P3(xPost, yFrameCenter - 8, zBolt));
      });
    });

    // --- PÓŁKA OPOROWA POD SUFIT (kątownik Alu L 25x25x2 wklejany na klej 2K do górnego rygla) ---
    const shelfLHoriz = addCadMesh(new THREE.BoxGeometry(frameW - 40, 2, 25), matAluFrame, panelUnitG);
    shelfLHoriz.position.copy(P3(0, yFrameCenter - prof / 2 - 11.5, 1187)); // Podpiera Dibond 2 mm sufitu na Z=1188
    const shelfLVert = addCadMesh(new THREE.BoxGeometry(frameW - 40, 23, 2), matAluFrame, panelUnitG);
    shelfLVert.position.copy(P3(0, yFrameCenter - prof / 2 - 1, 1176.5));

    // --- LEKKIE WSPORNIKI ALU 25x25x2 POD ŻEBRA DACHU (wklejane 2K + nitowane do górnego rygla, Z = 1200..1246) ---
    [-195, 195].forEach(xPed => {
      const pedPost = addCadMesh(new THREE.BoxGeometry(25, 46, 25), matAluFrame, panelUnitG);
      pedPost.position.copy(P3(xPed, yFrameCenter, frameZTop + 23));
      const pedBase = addCadMesh(new THREE.BoxGeometry(44, 3, 28), matAluFrame, panelUnitG);
      pedBase.position.copy(P3(xPed, yFrameCenter, frameZTop + 1.5));
    });

    // Wypełnienie PIR 50 mm + Dibond wewnętrzny 2 mm + Kapinos Dibond 2 mm (wszystko klejone 2K PU/MMA)
    const pirOut = addCadMesh(pirWallOuterGeo, matPirFoam, panelUnitG);
    pirOut.position.y = ROOF.Z_BOT_RAIL_TOP;
    const pirLab = addCadMesh(pirWallInnerLabGeo, matPirFoam, panelUnitG);
    pirLab.position.y = ROOF.Z_PLUG_BOT;

    [890, 1150].forEach(zSp => {
      [-150, 0, 150].forEach(xOff => {
        const spMesh = addCadMesh(new THREE.BoxGeometry(24, 18, 17.3), matG10Spacer, panelUnitG);
        spMesh.position.copy(P3(xOff, 393, zSp));
      });
    });

    const plyIn = addCadMesh(plyWallInnerGeo, matWhiteDibond, panelUnitG);
    plyIn.position.y = 865;
    const skSp = addCadMesh(skirtSpacerGeo, matAluFrame, panelUnitG);
    skSp.position.y = ROOF.Z_EPDM_TOP;
    const dibSkirt = addCadMesh(dibondSkirtWallGeo, matWhiteDibond, panelUnitG);
    dibSkirt.position.y = ROOF.Z_SKIRT_BOT;

    const ventMeshGeo = createHexWallLayerGeo(ROOF.R_SKIRT_OUT, ROOF.R_SKIRT_OUT - 2, 28, 4);
    const vm = addCadMesh(ventMeshGeo, matMeshScreen, panelUnitG);
    vm.position.y = ROOF.Z_WALL_TOP;

    if (document.body.dataset.part !== "konstrukcja" &&
        (normDeg === 30 || normDeg === 90 || normDeg === 150 || normDeg === 330)) {
      const ySkirt = ROOF.R_SKIRT_OUT * c30;
      const zRailMid = (ROOF.Z_EPDM_TOP + ROOF.Z_BOT_RAIL_TOP) / 2;
      const zCatchBar = ROOF.Z_SKIRT_BOT - 4 - 4;
      const latchBody = addCadMesh(new THREE.BoxGeometry(48, 28, 16), matInoxHardware, panelUnitG);
      latchBody.userData.isDrawLatch = true;
      latchBody.position.copy(P3(0, ySkirt + 8, zRailMid));
      const latchLever = addCadMesh(new THREE.BoxGeometry(28, 22, 8), matInoxHardware, panelUnitG);
      latchLever.userData.isDrawLatch = true;
      latchLever.position.copy(P3(0, ySkirt + 20, zRailMid - 8));
      const bailZ = (zRailMid - 8 + zCatchBar) / 2;
      const bailR = (zRailMid - 8 - zCatchBar) / 2;
      const bail = addCadMesh(new THREE.TorusGeometry(bailR, 3.2, 8, 24, Math.PI), matInoxHardware, panelUnitG);
      bail.userData.isDrawLatch = true;
      bail.rotation.z = Math.PI / 2;
      bail.position.copy(P3(0, ySkirt + 16, bailZ));
      [-16, 16].forEach(xOff => {
        const latchBolt = addCadMesh(new THREE.CylinderGeometry(3, 3, 22, 12), matInoxHardware, panelUnitG);
        latchBolt.userData.isDrawLatch = true;
        latchBolt.rotation.x = Math.PI / 2;
        latchBolt.position.copy(P3(xOff, ySkirt + 1, zRailMid));
      });
    }

    // Rączki: wyłącznie ściany BEZ ekranów — SE 150° i NW 330° (ekrany są na 210° i 270°).
    // Jedyna przeciwległa para heksagonu bez ekranów. Z = 1185 → nitonakrętki w górnym ryglu (1170–1200).
    // Ukrywane w konstrukcja.html (isRoofHandle), jak klamry dociągowe.
    if (document.body.dataset.part !== "konstrukcja" &&
        (normDeg === 150 || normDeg === 330)) {
      const yFace = ROOF.R_SKIRT_OUT * c30;
      const zHandle = 1185; // środek górnego rygla 30×30
      const standOut = 48;
      const gripHalf = 70;
      [-gripHalf, gripHalf].forEach(xOff => {
        const post = addCadMesh(new THREE.BoxGeometry(18, standOut, 18), matAluFrame, panelUnitG);
        post.userData.isRoofHandle = true;
        post.position.copy(P3(xOff, yFace + standOut / 2, zHandle));
        const foot = addCadMesh(new THREE.BoxGeometry(36, 4, 28), matAluFrame, panelUnitG);
        foot.userData.isRoofHandle = true;
        foot.position.copy(P3(xOff, yFace + 2, zHandle));
        const bolt = addCadMesh(new THREE.CylinderGeometry(3, 3, 28, 12), matInoxHardware, panelUnitG);
        bolt.userData.isRoofHandle = true;
        bolt.rotation.x = Math.PI / 2;
        bolt.position.copy(P3(xOff, yFace - 6, zHandle)); // przez fartuch w rygiel
      });
      const grip = addCadMesh(new THREE.CylinderGeometry(11, 11, 160, 24), matAluFrame, panelUnitG);
      grip.userData.isRoofHandle = true;
      grip.rotation.z = Math.PI / 2;
      grip.position.copy(P3(0, yFace + standOut + 2, zHandle));
    }

    if (normDeg === 270 || normDeg === 210) {
      const addRoofLayer = (factor) => {
        const g = new THREE.Group();
        wG.add(g);
        roofLayerExplosions.push({ group: g, factor });
        return g;
      };
      const distG = addRoofLayer(1.55);
      const scrG = addRoofLayer(1.85);
      roofSolarScreenLayers.push(distG, scrG);
      // Tulejki PA6/PTFE Ø20×24 + M6 przelotowe od fartucha Dibond 2 mm; ekran Dibond 2 mm.
      const snapL = 24, snapR = 10;
      const skirtOuterR = ROOF.R_SKIRT_OUT;
      const screenInR = skirtOuterR + snapL;   // 535
      const screenOutR = screenInR + 2;       // 537
      const skirtOuterAp = skirtOuterR * c30;
      const screenInnerAp = screenInR * c30;
      const standAp = (skirtOuterAp + screenInnerAp) / 2;
      const boltLen = snapL + 18;
      const screenBottom = HEX.Z_TOP;
      const screenTop = ROOF.Z_WALL_TOP;
      [-210, 0, 210].forEach(xD => {
        [930, 1100].forEach(zD => {
          const sleeve = addCadMesh(new THREE.CylinderGeometry(snapR, snapR, snapL, 20), matSnapSpacer, distG);
          sleeve.rotation.x = Math.PI / 2;
          sleeve.position.copy(P3(xD, standAp, zD));
          const bolt = addCadMesh(new THREE.CylinderGeometry(3, 3, boltLen, 12), matInoxHardware, distG);
          bolt.rotation.x = Math.PI / 2;
          bolt.position.copy(P3(xD, standAp, zD));
          const head = addCadMesh(new THREE.CylinderGeometry(5, 5, 3.5, 6), matInoxHardware, distG);
          head.rotation.x = Math.PI / 2;
          head.position.copy(P3(xD, screenInnerAp + 4, zD));
        });
      });
      const screenGeo = createHexWallLayerGeo(screenOutR, screenInR, screenTop - screenBottom, 0);
      const screenMesh = addCadMesh(screenGeo, matSolarScreen, scrG);
      screenMesh.position.y = screenBottom;
    }
  });

  // Kliny narożne PIR + taśmy EPDM + kątowniki narożne 120° z aluminium 3 mm i śrubami M6
  const roofSealT = 4;
  const roofCos60 = Math.cos(Math.PI / 3), roofSin60 = Math.sin(Math.PI / 3);
  const roofYProf = ROOF.R_ALU_C * Math.cos(Math.PI / 6);
  const roofPostFace = (yoff) => {
    const Y = roofYProf + yoff;
    const xFace = frameW / 2;
    return [xFace * roofCos60 + Y * roofSin60, xFace * roofSin60 - Y * roofCos60];
  };
  const roofFaceIn = roofPostFace(-15), roofFaceOut = roofPostFace(15);
  const roofFaceDx = roofFaceOut[0] - roofFaceIn[0], roofFaceDz = roofFaceOut[1] - roofFaceIn[1];
  const roofFaceLen = Math.hypot(roofFaceDx, roofFaceDz);
  const roofNx = -roofFaceDz / roofFaceLen, roofNz = roofFaceDx / roofFaceLen;
  const roofIn0 = [roofFaceIn[0] + roofNx * roofSealT, roofFaceIn[1] + roofNz * roofSealT];
  const roofIn1 = [roofFaceOut[0] + roofNx * roofSealT, roofFaceOut[1] + roofNz * roofSealT];
  const roofMirror = (p) => [p[0], -p[1]];
  const roofInner = ROOF.R_PLY_IN;
  const roofLap = 7;
  const roofLapX = roofInner - roofLap / Math.sqrt(3);
  const roofPlugPts = [
    [roofInner, 0],
    [roofLapX, -roofLap],
    [462, -6],
    roofIn0,
    roofIn1,
    [ROOF.R_SKIRT_OUT, -2],
    [ROOF.R_SKIRT_OUT, 2],
    roofMirror(roofIn1),
    roofMirror(roofIn0),
    [462, 6],
    [roofLapX, roofLap]
  ];
  const roofSealBot = ROOF.Z_BOT_RAIL_TOP;
  const roofSealTop = 1188;
  const roofPostTop = ROOF.Z_TOP_RAIL_BOT;
  const roofExtrude = (pts, height) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let k = 1; k < pts.length; k++) shape.lineTo(pts[k][0], -pts[k][1]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    return geo;
  };
  const roofPlugGeo = roofExtrude(roofPlugPts, roofSealTop - roofSealBot);
  const roofGasketGeo = roofExtrude([roofFaceIn, roofFaceOut, roofIn1, roofIn0], roofPostTop - roofSealBot);
  const roofGasketGeoM = roofExtrude([roofMirror(roofFaceIn), roofMirror(roofFaceOut), roofMirror(roofIn1), roofMirror(roofIn0)], roofPostTop - roofSealBot);
  const roofSeamGeo = roofExtrude([
    [ROOF.R_SKIRT_OUT - 2, -1.6], [ROOF.R_SKIRT_OUT + 4, -1.2],
    [ROOF.R_SKIRT_OUT + 4, 1.2], [ROOF.R_SKIRT_OUT - 2, 1.6]
  ], roofSealTop - roofSealBot);

  for (let i = 0; i < 6; i++) {
    const cornerG = new THREE.Group();
    cornerG.rotation.y = (i * 60) * Math.PI / 180;
    roofWallsGroup.add(cornerG);
    [945, 1125].forEach(zBr => {
      // Kątowniki 120° z lekkiego aluminium 3 mm + śruby M6 w nitonakrętkach
      const brLeft = addCadMesh(new THREE.BoxGeometry(3, 46, 46), matAluFrame, cornerG);
      brLeft.position.set(ROOF.R_ALU_IN - 9, zBr, -19);
      brLeft.rotation.y = Math.PI / 6;
      const brRight = addCadMesh(new THREE.BoxGeometry(3, 46, 46), matAluFrame, cornerG);
      brRight.position.set(ROOF.R_ALU_IN - 9, zBr, 19);
      brRight.rotation.y = -Math.PI / 6;
      [-21, 21].forEach(zB => {
        const cBolt = addCadMesh(new THREE.CylinderGeometry(3.2, 3.2, 32, 16), matInoxHardware, cornerG);
        cBolt.rotation.z = Math.PI / 2;
        cBolt.position.set(ROOF.R_ALU_IN + 3, zBr, zB);
      });
    });
    const plug = addCadMesh(roofPlugGeo, matPirFoam, cornerG);
    plug.position.y = roofSealBot;
    const gasket = addCadMesh(roofGasketGeo, matEpdmSeal, cornerG);
    gasket.position.y = roofSealBot;
    const gasketM = addCadMesh(roofGasketGeoM, matEpdmSeal, cornerG);
    gasketM.position.y = roofSealBot;
    const seam = addCadMesh(roofSeamGeo, matEpdmSeal, cornerG);
    seam.position.y = roofSealBot;
  }

  // 2. WKŁAD SUFITOWY KLEJONY 2K PU (DIBOND 2 mm + PIR 50 mm, Z = 1188..1240 mm)
  const ceilPlyMesh = addCadMesh(createFullHexPlateGeo(ROOF.R_ALU_IN - 4, 2, 0), matWhiteDibond, roofCeilingPirGroup);
  ceilPlyMesh.position.y = 1188;
  const ceilPirMesh = addCadMesh(createFullHexPlateGeo(ROOF.R_ALU_IN - 4, 50, 0), matPirFoam, roofCeilingPirGroup);
  ceilPirMesh.position.y = 1190;

  // 3. PAJĄK: płaskowniki 30×4 na płasko; piasta 4+4+4=12 mm (tulejka = grubość płaskownika).
  // Górne końce odgięte o ~11° na odcinku 35 mm — wchodzą poziomo między tarcze.
  const hubBot = 1336;
  const hubH = 12; // 4 tarcza + 4 tulejka + 4 tarcza
  const hub = addCadMesh(createHollowCylinderGeo(34, 30, 4, 48), matAluFrame, roofRaftersGroup);
  hub.position.set(0, hubBot + 6, 0); // tulejka dystansowa H=4 między tarczami
  const hubPlateBot = addCadMesh(createHollowCylinderGeo(70, 30, 4, 48), matAluFrame, roofRaftersGroup);
  hubPlateBot.position.set(0, hubBot + 2, 0);
  const hubPlateTop = addCadMesh(createHollowCylinderGeo(70, 30, 4, 48), matAluFrame, roofRaftersGroup);
  hubPlateTop.position.set(0, hubBot + 10, 0);
  const zHubFlat = hubBot + 6; // oś płaskownika w szczelinie 4 mm

  const wallRot = (30 - 90) * Math.PI / 180;
  const cW = Math.cos(wallRot), sW = Math.sin(wallRot);
  const pedLocalX = -195, pedLocalZ = -yFrameCenter;
  const pedWx = pedLocalX * cW + pedLocalZ * sW;
  const pedWz = -pedLocalX * sW + pedLocalZ * cW;
  const rafTh = 60 * Math.PI / 180;
  const cRaf = Math.cos(rafTh), sRaf = Math.sin(rafTh);
  const mountR = pedWx * cRaf - pedWz * sRaf;
  const mountZ = Math.abs(pedWx * sRaf + pedWz * cRaf);

  const rEave = ROOF.R_EAVE_OUT;
  const zEaveRib = 1248;
  const tipLen = 35;
  const bendDeg = 11 * Math.PI / 180;

  for (let i = 0; i < 6; i++) {
    const rafG = new THREE.Group();
    rafG.rotation.y = (i * 60) * Math.PI / 180;
    roofRaftersGroup.add(rafG);

    const gluedInShop = (i % 3) === 0;
    const rTip0 = gluedInShop ? 34 : 38;
    // Końcówka odgięta do poziomu (między tarcze piasty)
    const tip = addCadMesh(new THREE.BoxGeometry(tipLen, 4, 30), matAluFrame, rafG);
    tip.position.set(rTip0 + tipLen / 2, zHubFlat, 0);

    // Odcinek skośny: od końca odgięcia do okapu (~11° do poziomu)
    const rMain0 = rTip0 + tipLen;
    const dx = rEave - rMain0;
    const dz = zHubFlat - zEaveRib;
    const rafLen = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx); // ≈ 11°
    const rafterMesh = addCadMesh(new THREE.BoxGeometry(rafLen, 4, 30), matAluFrame, rafG);
    rafterMesh.position.set(rMain0 + dx / 2, zEaveRib + dz / 2, 0);
    rafterMesh.rotation.z = -angle;
    // Kąt odgięcia względem skosu ≈ bendDeg (informacyjnie zgodny z dokumentacją)
    void bendDeg;

    if (gluedInShop) {
      [-8, 8].forEach(zRiv => {
        const rivet = addCadMesh(new THREE.CylinderGeometry(2.5, 2.5, 14, 12), matAluFrame, rafG);
        rivet.position.set(52, zHubFlat, zRiv);
      });
    } else {
      const screwR = 54;
      const screw = addCadMesh(new THREE.CylinderGeometry(2.5, 2.5, 16, 12), matInoxHardware, rafG);
      screw.position.set(screwR, zHubFlat, 0);
      const head = addCadMesh(new THREE.CylinderGeometry(5, 5, 3.5, 6), matInoxHardware, rafG);
      head.position.set(screwR, hubBot + hubH + 1.5, 0);
    }

    const crossTee = addCadMesh(new THREE.BoxGeometry(26, 4, mountZ * 2 + 26), matAluFrame, rafG);
    crossTee.position.set(mountR, 1248, 0);
    [-mountZ, mountZ].forEach(zOff => {
      const mountBolt = addCadMesh(new THREE.CylinderGeometry(3, 3, 18, 12), matInoxHardware, rafG);
      mountBolt.position.set(mountR, 1244, zOff);
    });
  }

  // 4. POŁACIE TROPIKU unoszone nad górną płaszczyznę żeber (bez przecinania)
  const zTropikEave = 1259;
  const zTropikPeak = 1364;
  const slopeGeo = createSlopedRoofTriangleGeo(rEave, 60, zTropikEave, zTropikPeak, 2); // Dibond 2 mm
  wallNormalsDeg.forEach(normDeg => {
    const slG = new THREE.Group();
    slG.rotation.y = (normDeg - 90) * Math.PI / 180;
    roofTropikSlopesGroup.add(slG);
    addCadMesh(slopeGeo, matWhiteDibond, slG);
  });

  for (let i = 0; i < 3; i++) {
    const a = (i * 120) * Math.PI / 180;
    const strut = addCadMesh(new THREE.CylinderGeometry(3.5, 3.5, 24, 12), matInoxHardware, roofTropikSlopesGroup);
    strut.position.set(58 * Math.cos(a), zTropikPeak + 10, 58 * Math.sin(a));
  }
  const ventCapCone = addCadMesh(new THREE.ConeGeometry(98, 24, 48), matWhiteDibond, roofTropikSlopesGroup);
  ventCapCone.position.set(0, zTropikPeak + 24, 0);
}

function initDimensionLabels() {
  const container = document.getElementById('labels-container');
  const specs = [
    { text: "Szczyt kapelusza dachu Z=1388 mm", pos: P3(0, 0, 1405), cls: "vertex", part: "roof" },
    { text: "Sufit pełny: Dibond 2 + PIR 50 (Z=1188..1240)", pos: P3(220, 0, 1216), cls: "amber", part: "roof" },
    { text: "Rączki: SE 150° + NW 330° (bez ekranów), Z=1185 w ryglu", pos: P3(420, -240, 1185), cls: "amber", part: "roof" },
    { text: "Wieniec ścian bazy Z=860 mm (Kapinos do 825)", pos: P3(465, 433, 860), cls: "vertex", part: "hex" },
    { text: "2× Ekran Dibond 2 mm S+SW, tulejka PA6 Ø20×24 + M6", pos: P3(0, -1500, 520), cls: "amber", part: "hex" },
    { text: "Czop słupa Z=910, talerzyki na ziemi (Z=0..6)", pos: P3(0, 0, 918), cls: "green", part: "pier" },
    { text: "Ramiak dolny Z=185 (15 mm nad płytą na ramieniu)", pos: P3(0, -320, 172), cls: "green", part: "hex" },
    { text: "Ceownik ∏ 220×25×5, płyta 300×300 do Z=75", pos: P3(360, -360, 40), cls: "", part: "hex" },
    { text: "Okap, talerz Wi-Fi i trzy przepusty (230 V / ETH / PV)", pos: P3(0, 760, 720), cls: "", part: "hex" },
    { text: "Rozdzielnica 230 V, tylko gdy sieć jest włączona", pos: P3(0, 250, 680), cls: "green", part: "hex" },
    { text: "1× LiFePO4 100 Ah (S) + MPPT 100/30 (panel 450 W)", pos: P3(0, -230, 480), cls: "amber", part: "hex" },
    { text: "BME280 na ścianie SE, nie nad grzałkami N/SW", pos: P3(420, -360, 600), cls: "green", part: "hex" },
  ];

  specs.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dim-label' + (item.cls ? ' ' + item.cls : '');
    el.textContent = item.text;
    container.appendChild(el);
    dimLabels.push({ el, pos: item.pos.clone(), part: item.part });
  });
}

function updateDimensionLabels() {
  if (!camera) return;
  const w = window.innerWidth, h = window.innerHeight;
  dimLabels.forEach(item => {
    const hiddenPart =
      (item.part === 'hex' && assemblyView === 'pier') ||
      (item.part === 'pier' && assemblyView === 'hex') ||
      (item.part === 'roof' && (!isRoofVisible || assemblyView === 'pier'));
    if (!areDimsVisible || hiddenPart) { item.el.style.opacity = '0'; return; }
    const worldPos = item.pos.clone();
    if (item.part === 'roof' && roofMasterGroup) {
      worldPos.y += roofMasterGroup.position.y;
    }
    const proj = worldPos.project(camera);
    if (proj.z > 1) { item.el.style.opacity = '0'; return; }
    item.el.style.left = `${(proj.x * 0.5 + 0.5) * w}px`;
    item.el.style.top = `${(-(proj.y * 0.5) + 0.5) * h}px`;
    item.el.style.opacity = '1';
  });
}

function setAssemblyView(mode) {
  assemblyView = mode;
  ['hex', 'pier', 'both'].forEach(name => {
    const btn = document.getElementById('btn-view-' + name);
    if (btn) btn.classList.toggle('active', mode === name);
  });
  applyAssemblyView();
}

function applyAssemblyView() {
  const showHex = assemblyView !== 'pier';
  const showPier = assemblyView !== 'hex';
  if (hexRootGroup) hexRootGroup.visible = showHex;
  if (solarScreensGroup) solarScreensGroup.visible = showHex && isSolarScreensVisible;
  hexSolarScreenLayers.forEach(g => { g.visible = showHex && isSolarScreensVisible; });
  roofSolarScreenLayers.forEach(g => { g.visible = showHex && isRoofVisible && isSolarScreensVisible; });
  if (ballastGroup) ballastGroup.visible = showHex && isBallastVisible;
  if (pierBallastGroup) pierBallastGroup.visible = showPier && isBallastVisible;
  if (pierLiftGroup) pierLiftGroup.visible = showPier;
  const part = document.body.dataset.part || "cad";
  const showEquip = part !== "obudowa" && part !== "elektronika";
  if (equipEnvelopeGroup) equipEnvelopeGroup.visible = showEquip && showPier && isEquipVisible;
  if (roofMasterGroup) roofMasterGroup.visible = showHex && isRoofVisible;
  if (roofTropikSlopesGroup) roofTropikSlopesGroup.visible = isTropikSkinVisible;
}

function toggleSection() {
  isSectionActive = !isSectionActive;
  document.getElementById('btn-section')?.classList.toggle('active', isSectionActive);
  const planes = isSectionActive ? [clipPlaneAA] : [];
  allMaterials.forEach(m => {
    m.clippingPlanes = planes;
    m.needsUpdate = true;
  });
}

function toggleParkPose() {
  isParkedPose = !isParkedPose;
  const btn = document.getElementById('btn-pose');
  const lbl = document.getElementById('pose-label');
  if (btn) btn.classList.toggle('active', isParkedPose);
  if (lbl) lbl.textContent = isParkedPose ? 'Pozycja: Park (Poziomo)' : 'Pozycja: Home (52°)';
  if (otaPivotGroup) {
    otaPivotGroup.rotation.set(0, 0, isParkedPose ? Math.PI / 2 : 0);
  }
}

function toggleExplodeHead() {
  isHeadExploded = !isHeadExploded;
  document.getElementById('btn-explode')?.classList.toggle('active', isHeadExploded);
  targetExplodeY = isHeadExploded ? 65 : 0;
}

function toggleEquipmentEnvelope() {
  isEquipVisible = !isEquipVisible;
  document.getElementById('btn-equip')?.classList.toggle('active', isEquipVisible);
  applyAssemblyView();
}

function toggleSolarScreens() {
  isSolarScreensVisible = !isSolarScreensVisible;
  document.getElementById('btn-screens')?.classList.toggle('active', isSolarScreensVisible);
  applyAssemblyView();
}

function toggleBallast() {
  isBallastVisible = !isBallastVisible;
  document.getElementById('btn-ballast')?.classList.toggle('active', isBallastVisible);
  applyAssemblyView();
}

function toggleRoof() {
  isRoofVisible = !isRoofVisible;
  document.getElementById('btn-roof')?.classList.toggle('active', isRoofVisible);
  applyAssemblyView();
}

function toggleLiftRoof() {
  isRoofLifted = !isRoofLifted;
  document.getElementById('btn-roof-lift')?.classList.toggle('active', isRoofLifted);
  targetMasterLiftY = isRoofLifted ? 180 : 0;
}

function toggleExplodeRoof() {
  isRoofExploded = !isRoofExploded;
  document.getElementById('btn-roof-explode')?.classList.toggle('active', isRoofExploded);
  targetWallsRadialExplode = isRoofExploded ? 75 : 0;   // Rozsuwa 6 kaset ściennych promieniowo
  targetCeilingExplodeY = isRoofExploded ? 140 : 0;     // Unosi wkład sufitowy PIR + Dibond
  targetSlopesExplodeY = isRoofExploded ? 340 : 0;      // Unosi poszycie tropiku
}

function toggleTropikSkin() {
  isTropikSkinVisible = !isTropikSkinVisible;
  document.getElementById('btn-roof-skin')?.classList.toggle('active', isTropikSkinVisible);
  applyAssemblyView();
}

function toggleDimensions() {
  areDimsVisible = !areDimsVisible;
  document.getElementById('btn-dims')?.classList.toggle('active', areDimsVisible);
}

function toggle2DDrawer() {
  const drawer = document.getElementById('drawer-2d');
  const btn = document.getElementById('btn-drawer-2d');
  const isOpen = drawer.classList.toggle('open');
  btn.classList.toggle('active', isOpen);
  if (isOpen) renderHex2DSvgDrawings();
}

function renderHex2DSvgDrawings() {
  const hostPlan = document.getElementById('svg-hex-plan');
  if (!hostPlan || hostPlan.dataset.done === '1') return;
  hostPlan.dataset.done = '1';

  const tx = (x, y, s, a = 'middle', col = '#1c1c1c') =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a}" dominant-baseline="central" fill="${col}">${s}</text>`;
  const wrap = (w, h, b) => `<svg viewBox="0 0 ${w} ${h}" width="100%">${b}</svg>`;

  {
    const w = 420, h = 450, cx = 210, cy = 190, s = 0.28;
    let o = '';
    o += `<line x1="20" y1="${cy}" x2="400" y2="${cy}" stroke="#cbd5e1" stroke-dasharray="4 3"/>`;
    o += `<line x1="${cx}" y1="20" x2="${cx}" y2="360" stroke="#cbd5e1" stroke-dasharray="4 3"/>`;

    [60, 180, 300].forEach(deg => {
      const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const rot = (x, y) => [cx + (x * ca - y * sa) * s, cy - (x * sa + y * ca) * s];
      const f1 = rot(120, -70), f2 = rot(520, -70), f3 = rot(520, 70), f4 = rot(120, 70);
      o += `<polygon points="${f1.join(',')} ${f2.join(',')} ${f3.join(',')} ${f4.join(',')}" fill="#64748b" stroke="#1e293b" stroke-width="1.2"/>`;
      const b1 = rot(135, -150), b2 = rot(435, -150), b3 = rot(435, 150), b4 = rot(135, 150);
      o += `<polygon points="${b1.join(',')} ${b2.join(',')} ${b3.join(',')} ${b4.join(',')}" fill="#94a3b8" fill-opacity="0.55" stroke="#334155" stroke-dasharray="3 2"/>`;
    });

    const hexPts = (R) => {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * 60) * Math.PI / 180;
        pts.push(`${(cx + R * s * Math.cos(a)).toFixed(1)},${(cy - R * s * Math.sin(a)).toFixed(1)}`);
      }
      return pts.join(' ');
    };

    o += `<polygon points="${hexPts(500)}" fill="#fde047" stroke="#1c1c1c" stroke-width="1.4"/>`;
    o += `<polygon points="${hexPts(442.3)}" fill="#e4d2ae" stroke="#854d0e" stroke-width="1"/>`;
    o += `<polygon points="${hexPts(428.4)}" fill="#ffffff" stroke="#1c1c1c" stroke-width="1.2"/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${HEX.HOLE_R * s}" fill="#3f3f46" stroke="#18181b"/>`;
    o += `<circle cx="${cx}" cy="${cy}" r="${HEX.SEAL_IN_R * s}" fill="#ffffff" stroke="#18181b" stroke-dasharray="3 2"/>`;

    // Ekrany Dibond 2 mm na S (270°) i SW (210°), tulejka PA6/PTFE Ø20×24 + M6.
    const screenFace = (normDeg, r) => {
      const n = normDeg * Math.PI / 180;
      const t = 30 * Math.PI / 180;
      const x1 = cx + r * s * Math.cos(n - t);
      const y1 = cy - r * s * Math.sin(n - t);
      const x2 = cx + r * s * Math.cos(n + t);
      const y2 = cy - r * s * Math.sin(n + t);
      return `${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    };
    o += `<polyline points="${screenFace(270, 530)}" fill="none" stroke="#0369a1" stroke-width="6" stroke-linecap="square"/>`;
    o += `<polyline points="${screenFace(210, 530)}" fill="none" stroke="#0369a1" stroke-width="6" stroke-linecap="square"/>`;

    const vLabels = [
      { t: "V1 (+500, 0)", x: cx + 500 * s + 38, y: cy - 8 },
      { t: "V2 (+250, +433) [Stopa]", x: cx + 250 * s + 42, y: cy - 433 * s - 10 },
      { t: "V3 (-250, +433)", x: cx - 250 * s - 35, y: cy - 433 * s - 10 },
      { t: "V4 (-500, 0) [Stopa]", x: cx - 500 * s - 48, y: cy - 12 },
      { t: "V5 (-250, -433)", x: cx - 250 * s - 42, y: cy + 433 * s + 14 },
      { t: "V6 (+250, -433) [Stopa]", x: cx + 250 * s + 45, y: cy + 433 * s + 14 }
    ];
    vLabels.forEach(vl => { o += tx(vl.x, vl.y, vl.t); });
    o += tx(cx, cy + 18, "Otwór podłogi Ø158,4 mm", "middle", "#1c1c1c");
    o += tx(cx, cy + 214, "Ekrany Dibond 2 mm + tulejka Ø20×24/M6: S (270°) i SW (210°)", "middle", "#0369a1");
    hostPlan.innerHTML = wrap(w, h, o);
  }

  {
    const w = 420, h = 230;
    let o = '';
    o += `<line x1="20" y1="200" x2="400" y2="200" stroke="#1c1c1c" stroke-width="1.2"/>`;
    o += `<rect x="45" y="188" width="95" height="12" fill="#475569" stroke="#1c1c1c"/>`;
    o += `<rect x="260" y="188" width="95" height="12" fill="#475569" stroke="#1c1c1c"/>`;
    o += `<rect x="35" y="150" width="290" height="11" fill="#e4d2ae" stroke="#1c1c1c"/>`;
    o += `<rect x="68" y="102" width="102" height="5" fill="#e4d2ae" stroke="#1c1c1c"/>`;
    o += `<rect x="250" y="102" width="102" height="5" fill="#e4d2ae" stroke="#1c1c1c"/>`;
    o += `<rect x="68" y="87" width="102" height="15" fill="#fde047" stroke="#854d0e"/>`;
    o += `<rect x="250" y="87" width="102" height="15" fill="#fde047" stroke="#854d0e"/>`;
    o += `<rect x="52" y="15" width="16" height="135" fill="#fde047" stroke="#854d0e"/>`;
    o += `<rect x="352" y="15" width="16" height="135" fill="#fde047" stroke="#854d0e"/>`;
    o += tx(210, 36, "Góra bazy Z = 860 mm, czop słupa Z = 910 mm");
    o += tx(210, 118, "Ramiak Z = 185 mm (15 mm nad płytą na ramieniu Z=170)");
    o += tx(95, 212, "Stopa V4: ceownik ∏ 220×25×5, płyta 300×300×50 na Z 25..75");
    document.getElementById('svg-hex-sec').innerHTML = wrap(w, h, o);
  }

  {
    const w = 420, h = 165;
    let o = '';
    o += `<rect x="40" y="55" width="135" height="50" fill="#fde047" stroke="#854d0e"/>`;
    o += `<rect x="245" y="55" width="135" height="50" fill="#fde047" stroke="#854d0e"/>`;
    o += `<rect x="175" y="55" width="70" height="30" fill="#e2e8f0" stroke="#1c1c1c"/>`;
    o += `<rect x="175" y="85" width="70" height="20" fill="#86efac" stroke="#166534"/>`;
    o += `<rect x="40" y="105" width="340" height="14" fill="#e4d2ae" stroke="#1c1c1c"/>`;
    o += `<rect x="40" y="47" width="340" height="5" fill="#ffffff" stroke="#1c1c1c"/>`;
    o += `<rect x="40" y="28" width="340" height="5" fill="#bae6fd" stroke="#0369a1"/>`;
    o += `<rect x="100" y="33" width="8" height="14" fill="#94a3b8" stroke="#1c1c1c"/>`;
    o += `<rect x="210" y="33" width="8" height="14" fill="#94a3b8" stroke="#1c1c1c"/>`;
    o += `<rect x="320" y="33" width="8" height="14" fill="#94a3b8" stroke="#1c1c1c"/>`;
    o += tx(108, 80, "PIR/XPS 50 mm");
    o += tx(312, 80, "PIR/XPS 50 mm");
    o += tx(210, 70, "Słupek Alu 30×30");
    o += tx(210, 95, "Dystans G10 (20)");
    o += tx(210, 112, "Sklejka wewnętrzna 12 mm (bez mostków!)");
    o += tx(250, 18, "Ekran Dibond 2 mm S/SW, tulejka PA6/PTFE Ø20×24 + M6");
    document.getElementById('svg-hex-corner').innerHTML = wrap(w, h, o);
  }
}

let shellClones = [];
let shellGhosted = false;

let structureGhostMat = null;
let structureCamGoal = null;
let structureTgtGoal = null;
let structureHardwareVisible = true;
let structureShowHex = true;
let structureShowRoof = true;
let structureDetailId = "calosc";

function structureHexUnit(normDeg) {
  const rot = (normDeg - 90) * Math.PI / 180;
  return hexWallUnitsExplosionList.find(u => u.parent && Math.abs(u.parent.rotation.y - rot) < 1e-3);
}

function structureRoofUnit(normDeg) {
  const rot = (normDeg - 90) * Math.PI / 180;
  return roofWallPanelsExplosionList.find(u => u.parent && Math.abs(u.parent.rotation.y - rot) < 1e-3);
}

function structurePoint(group, x, yCad, zCad) {
  return group.localToWorld(P3(x, yCad, zCad));
}

function structureRafter(index) {
  const rot = index * 60 * Math.PI / 180;
  // Pierścień i kołnierz też mają rotation.y = 0 — bierzemy tylko grupę żebra.
  return roofRaftersGroup.children.find(g =>
    g.type === "Group" && Math.abs(g.rotation.y - rot) < 1e-3
  );
}

function structureLook(focus, dist, lift, side) {
  const flat = new THREE.Vector3(focus.x, 0, focus.z);
  if (flat.lengthSq() < 100) flat.set(1, 0, 0.35);
  flat.normalize();
  const lateral = new THREE.Vector3(-flat.z, 0, flat.x).multiplyScalar(side || 1);
  const pos = focus.clone()
    .add(flat.multiplyScalar(dist))
    .add(lateral.multiplyScalar(Math.abs(dist) * 0.5))
    .add(new THREE.Vector3(0, lift, 0));
  return { pos, tgt: focus.clone() };
}

function structureCatalog() {
  const yC = HEX.R_ALU_C * Math.cos(Math.PI / 6);
  const yR = ROOF.R_ALU_C * Math.cos(Math.PI / 6);
  const cornerOf = (root, deg) => {
    const rot = deg * Math.PI / 180;
    return root.children.find(g => {
      if (Math.abs(g.rotation.y - rot) > 1e-3) return false;
      let wing = false;
      g.traverse(o => {
        if (!o.isMesh || o.geometry.type !== "BoxGeometry") return;
        const mat = o.userData._structOrig || o.material;
        if (mat !== matInoxHardware && mat !== matAluFrame) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        o.geometry.boundingBox.getSize(size);
        if (size.x < 10 && size.y > 40 && size.y < 60) wing = true;
      });
      return wing;
    });
  };
  return [
    {
      id: "calosc", group: "Widok", part: "both", label: "Całość", radius: 0,
      text: "Sześć ram obudowy i konstrukcja dachu. Bez balastu, poszycia, izolacji i wyposażenia.",
      focus: () => null,
      cam: () => ({ pos: new THREE.Vector3(1560, 1180, 1480), tgt: new THREE.Vector3(0, 640, 0) })
    },
    {
      id: "stopa", group: "Obudowa", part: "hex", label: "Stopa i kątownik", radius: 520,
      text: "Ceownik Π 220×25×5 łapie dwie długie nogi. Kątownik L 65×85×6, śruby M8 poziomo i M10 w dół ceownika.",
      focus: () => structurePoint(structureHexUnit(30), -212.5, yC, 70),
      cam: (p) => structureLook(p, 620, 180, 1)
    },
    {
      id: "zastrzal", group: "Obudowa", part: "hex", label: "Zastrzał", radius: 340,
      text: "Kątownik L 30×30×4 od wewnętrznej ścianki długiej nogi (Z = 52 mm) do 2/3 rygla dolnego. Cięcia ukośne, blachy węzłowe i śruby M8.",
      focus: () => structurePoint(structureHexUnit(30), -70, yC, 120),
      cam: (p) => structureLook(p, 480, 160, -1)
    },
    {
      id: "slupek", group: "Obudowa", part: "hex", label: "Krótki słupek", radius: 380,
      text: "Krótki słupek zaczyna się na Z = 185 mm, nad ramieniem słupa, i schodzi się z ryglem dolnym. W świetle ramy nie ma płytki.",
      focus: () => structurePoint(structureHexUnit(30), 212.5, yC, 230),
      cam: (p) => structureLook(p, 520, 140, 1)
    },
    {
      id: "klamra", group: "Obudowa", part: "hex", label: "Klamra 120°", radius: 280,
      text: "Kątownik gięty 120° z blachy Inox 4 mm skręca sąsiednie ramy. Na wierzchołku nad słupem klamry są na Z = 225, 520 i 795 mm.",
      focus: () => cornerOf(hexRootGroup, 0).localToWorld(new THREE.Vector3(HEX.R_ALU_IN - 10, 520, 0)),
      cam: (p) => structureLook(p, 460, 80, 1)
    },
    {
      id: "kaseta", group: "Dach", part: "roof", label: "Kaseta dachu", radius: 460,
      text: "Rama 455×328 mm z profilu Alu 30×30×1,5, klejona strukturalnie 2K z PIR 50 mm i Dibondem 2 mm (wewnątrz i fartuch).",
      focus: () => structurePoint(structureRoofUnit(30), 0, yR, 1036),
      cam: (p) => structureLook(p, 640, 220, 1)
    },
    {
      id: "polka", group: "Dach", part: "roof", label: "Półka sufitu", radius: 340,
      text: "Kątownik Alu L 25×25×2 mm wklejony na klej 2K do górnego rygla kasety. Podpiera płytę sufitu na Z = 1188 mm.",
      focus: () => structurePoint(structureRoofUnit(30), 0, yR - 29, 1182),
      cam: (p) => structureLook(p, 480, -40, -1)
    },
    {
      id: "piedestal", group: "Dach", part: "roof", label: "Słupek pod żebro", radius: 240,
      text: "Lekki wspornik z profilu Alu 25×25×2 mm (H = 46 mm), wklejany 2K i nitowany do górnego rygla.",
      focus: () => structurePoint(structureRoofUnit(30), -195, yR, 1223),
      cam: (p) => structureLook(p, 420, 120, 1)
    },
    {
      id: "klamra-dach", group: "Dach", part: "roof", label: "Klamra kasety", radius: 260,
      text: "Kątownik 120° z aluminium 3 mm łączący sąsiednie kasety śrubami M6 w nitonakrętkach (Z = 945 i 1125 mm).",
      focus: () => cornerOf(roofWallsGroup, 0).localToWorld(new THREE.Vector3(ROOF.R_ALU_IN - 9, 1125, 0)),
      cam: (p) => structureLook(p, -420, 90, 1)
    },
    {
      id: "spaw", group: "Dach", part: "roof", label: "Żebro spawane", radius: 280,
      text: "Żebro 30×4 na płasko: końcówka 35 mm odgięta o 11° do poziomu, wklejona 2K między tarcze piasty Ø140×4 (szczelina 4 mm).",
      focus: () => structureRafter(0).localToWorld(new THREE.Vector3(52, 1342, 8)),
      cam: (p) => structureLook(p, 320, 80, 1)
    },
    {
      id: "sruby", group: "Dach", part: "roof", label: "Żebro skręcane", radius: 240,
      text: "Cztery żebra 30×4 (końce odgięte 11°) wsuwane między tarcze piasty (H wewn. 4 mm) i skręcane M5.",
      focus: () => structureRafter(1).localToWorld(new THREE.Vector3(54, 1342, 0)),
      cam: (p) => structureLook(p, 300, -140, 1)
    },
    {
      id: "wieniec", group: "Dach", part: "roof", label: "Mocowanie do słupków", radius: 260,
      text: "Aluminiowa poprzeczka 26×4 mm i śruby M6 łączące płaskownik żebra ze wspornikami sąsiednich kaset.",
      focus: () => {
        const g = structureRafter(1);
        const tee = g.children.find(m => m.isMesh && m.position.y > 1246 && m.position.y < 1256 && m.position.x > 200);
        return g.localToWorld(tee.position.clone());
      },
      cam: (p) => structureLook(p, 460, 160, -1)
    }
  ];
}

function applyStructureIsolation(focus, radius) {
  [hexRootGroup, roofMasterGroup].forEach(root => {
    if (!root) return;
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!o.isMesh || !o.userData._structKeep) return;
      const baseMat = o.userData._structOrig || o.material;
      const isHw = baseMat === matInoxHardware || baseMat === matHeater;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const worldBox = new THREE.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      const near = !focus || worldBox.distanceToPoint(focus) <= radius;
      if (near) {
        if (o.userData._structOrig) {
          o.material = o.userData._structOrig;
          o.userData._structOrig = null;
        }
        o.visible = !isHw || structureHardwareVisible;
      } else {
        if (!o.userData._structOrig) o.userData._structOrig = o.material;
        o.material = structureGhostMat;
        o.visible = true;
      }
      o.children.forEach(c => { if (c.isLine) c.visible = o.visible && near; });
    });
  });
}

function showStructureDetail(id) {
  structureDetailId = id;
  const spec = structureCatalog().find(d => d.id === id) || structureCatalog()[0];
  document.querySelectorAll(".detail-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.id === spec.id));
  const note = document.getElementById("structure-note");
  if (note) note.textContent = spec.text;
  if (spec.part === "hex" || spec.part === "both") structureShowHex = true;
  if (spec.part === "roof" || spec.part === "both") structureShowRoof = true;
  if (hexRootGroup) hexRootGroup.visible = structureShowHex;
  if (roofMasterGroup) roofMasterGroup.visible = structureShowRoof;
  document.getElementById("btn-struct-hex")?.classList.toggle("active", structureShowHex);
  document.getElementById("btn-struct-roof")?.classList.toggle("active", structureShowRoof);
  const focus = spec.focus ? spec.focus() : null;
  applyStructureIsolation(focus, spec.radius);
  if (spec.cam) {
    const frame = spec.cam(focus);
    structureCamGoal = frame.pos;
    structureTgtGoal = frame.tgt;
  }
}

function toggleStructurePart(which) {
  if (which === "hex") structureShowHex = !structureShowHex;
  else structureShowRoof = !structureShowRoof;
  if (hexRootGroup) hexRootGroup.visible = structureShowHex;
  if (roofMasterGroup) roofMasterGroup.visible = structureShowRoof;
  document.getElementById("btn-struct-hex")?.classList.toggle("active", structureShowHex);
  document.getElementById("btn-struct-roof")?.classList.toggle("active", structureShowRoof);
}

function toggleStructureHardware() {
  structureHardwareVisible = !structureHardwareVisible;
  document.getElementById("btn-struct-hw")?.classList.toggle("active", structureHardwareVisible);
  const spec = structureCatalog().find(d => d.id === structureDetailId);
  const focus = spec && spec.focus ? spec.focus() : null;
  applyStructureIsolation(focus, spec ? spec.radius : 0);
}

function prepareAluminumStructure() {
  isBallastVisible = false;
  isSolarScreensVisible = false;
  isEquipVisible = false;
  [ballastGroup, solarScreensGroup, roofCeilingPirGroup, roofTropikSlopesGroup, equipEnvelopeGroup].forEach(g => {
    if (g) g.visible = false;
  });
  hexSolarScreenLayers.forEach(g => { g.visible = false; });
  roofSolarScreenLayers.forEach(g => { g.visible = false; });

  hexRootGroup.traverse(o => {
    if (!o.isMesh) return;
    if ((o.material === matDish || o.material === matSensor || o.material === matPiBoard) && o.parent && o.parent !== hexRootGroup) {
      o.parent.visible = false;
    }
  });

  const hideMat = new Set([matPirFoam, matPlywood, matWhiteDibond, matTropikDibond, matEpdmSeal, matG10Spacer, matArmaflex, matSolarScreen, matSnapSpacer, matMeshScreen, matBallast, matFan, matDinBox, matBattery, matDish, matCabGlass, matCharger, matSensor, matPiBoard]);
  [hexRootGroup, roofMasterGroup].forEach(root => {
    root.traverse(o => {
      if (!o.isMesh || !o.visible) return;
      let hiddenAncestor = false;
      for (let p = o.parent; p; p = p.parent) if (p.visible === false) hiddenAncestor = true;
      if (hiddenAncestor) return;
      if (o.userData.isDrawLatch || o.userData.isRoofHandle) {
        o.visible = false;
        return;
      }
      const isChannel = o.material === matBlackSteel && Math.abs(o.position.x - 330) < 1 && o.parent && o.parent.parent === hexRootGroup;
      const isBolt = o.material === matHeater && o.geometry && o.geometry.type === "CylinderGeometry";
      const structural = o.material === matAluFrame || o.material === matInoxHardware || isChannel || isBolt;
      if (!structural || hideMat.has(o.material)) {
        o.visible = false;
        return;
      }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      o.geometry.boundingBox.getSize(size);
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      if (o.material === matAluFrame && dims[1] > 180 && dims[2] > 180) {
        o.visible = false;
        return;
      }
      o.userData._structKeep = true;
    });
  });

  structureGhostMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8, transparent: true, opacity: 0.07, depthWrite: false, metalness: 0.1, roughness: 0.7
  });
  if (controls) controls.addEventListener("start", () => { structureCamGoal = null; structureTgtGoal = null; });

  const host = document.getElementById("structure-details");
  if (host) {
    let html = "";
    let lastGroup = "";
    structureCatalog().forEach(spec => {
      if (spec.group !== lastGroup) {
        html += `<h2>${spec.group}</h2>`;
        lastGroup = spec.group;
      }
      html += `<button type="button" class="detail-btn" data-id="${spec.id}" onclick="showStructureDetail('${spec.id}')">${spec.label}</button>`;
    });
    host.innerHTML = html;
  }
  showStructureDetail("calosc");
}

function ghostShell() {
  const solid = new Set([matBattery, matPiBoard, matDinBox, matCabGlass, matHeater, matFan, matEpdmSeal, matBlackSteel, matInoxHardware, matSensor, matCharger, matDish, matSolarScreen]);
  if (!hexRootGroup) return;
  hexRootGroup.traverse(o => {
    if (!o.isMesh || solid.has(o.material)) return;
    const c = o.material.clone();
    c.transparent = true;
    c.opacity = 0.14;
    c.depthWrite = false;
    o.material = c;
    shellClones.push(o);
  });
  shellGhosted = true;
}

function toggleShell() {
  shellGhosted = !shellGhosted;
  shellClones.forEach(o => {
    o.material.opacity = shellGhosted ? 0.14 : 0.94;
    o.material.depthWrite = !shellGhosted;
  });
  const btn = document.getElementById("btn-shell");
  if (btn) btn.classList.toggle("active", !shellGhosted);
}

function init() {
  const part = document.body.dataset.part || "cad";
  const container = document.getElementById("canvas-container");
  if (!container || typeof THREE === "undefined") return;
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d11);
    const presets = {
      slupek: { cam: [980, 820, 980], tgt: [0, 420, 0] },
      obudowa: { cam: [1580, 1180, 1520], tgt: [0, 430, 0] },
      dach: { cam: [1280, 1780, 1280], tgt: [0, 1120, 0] },
      elektronika: { cam: [1050, 900, -1350], tgt: [40, 500, -60] },
      zlozenie: { cam: [1680, 1480, 1680], tgt: [0, 640, 0] },
      konstrukcja: { cam: [1560, 1180, 1480], tgt: [0, 640, 0] },
      cad: { cam: [1450, 1380, 1450], tgt: [0, 680, 0] }
    };
    const preset = presets[part] || presets.cad;
    camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 5, 10000);
    camera.position.set(preset.cam[0], preset.cam[1], preset.cam[2]);
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    if (typeof THREE.OrbitControls !== "undefined") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(preset.tgt[0], preset.tgt[1], preset.tgt[2]);
      controls.maxDistance = 4500;
      controls.minDistance = 80;
    }
    const envMap = createStudioEnvMap();
    scene.environment = envMap;
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(800, 1450, 950);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 950;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.85);
    rimLight.position.set(-900, 700, -850);
    scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.45);
    fillLight.position.set(0, -450, 500);
    scene.add(fillLight);
    const grid = new THREE.GridHelper(2200, 44, 0x334155, 0x1e2430);
    grid.position.y = -0.5;
    scene.add(grid);
    initMaterials(envMap);
    const wantPier = part === "slupek" || part === "zlozenie" || part === "cad" || part === "elektronika";
    const wantHex = part === "obudowa" || part === "elektronika" || part === "zlozenie" || part === "cad" || part === "konstrukcja";
    const wantRoof = part === "dach" || part === "zlozenie" || part === "cad" || part === "konstrukcja";
    if (wantPier) buildPierModel();
    if (wantHex) buildHexagonalObservatory();
    else if (part === "slupek") buildEquipmentVerificationGroup();
    if (wantRoof) buildRoofModel();
    if (part === "obudowa" && equipEnvelopeGroup) equipEnvelopeGroup.visible = false;
    if (part === "elektronika") {
      if (equipEnvelopeGroup) equipEnvelopeGroup.visible = false;
      isSolarScreensVisible = true;
      if (ballastGroup) ballastGroup.visible = false;
      if (pierBallastGroup) pierBallastGroup.visible = false;
      isBallastVisible = false;
      ghostShell();
    }
    applyAssemblyView();
    if (part === "konstrukcja") prepareAluminumStructure();
    if (controls) controls.update();
    window.addEventListener("resize", () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.__boot = part;
    animate();
  } catch (err) {
    console.error("3D init error:", err);
    window.__bootError = String(err && err.stack || err);
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;
  if (extensionGroup) extensionGroup.position.y += (targetExplodeY - extensionGroup.position.y) * 0.12;
  if (g10SpacerGroup) {
    const g10Target = isHeadExploded ? 32 : 0;
    g10SpacerGroup.position.y += (g10Target - g10SpacerGroup.position.y) * 0.12;
  }
  if (m6ScrewsGroup) {
    const m6Target = isHeadExploded ? 36 : 0;
    m6ScrewsGroup.position.y += (m6Target - m6ScrewsGroup.position.y) * 0.12;
  }
  if (equipEnvelopeGroup) equipEnvelopeGroup.position.y += (targetExplodeY - equipEnvelopeGroup.position.y) * 0.12;
  if (roofMasterGroup) roofMasterGroup.position.y += (targetMasterLiftY - roofMasterGroup.position.y) * 0.10;
  if (roofCeilingPirGroup) roofCeilingPirGroup.position.y += (targetCeilingExplodeY - roofCeilingPirGroup.position.y) * 0.10;
  if (roofTropikSlopesGroup) roofTropikSlopesGroup.position.y += (targetSlopesExplodeY - roofTropikSlopesGroup.position.y) * 0.10;
  if (roofRaftersGroup) roofRaftersGroup.position.y += (targetCeilingExplodeY * 1.75 - roofRaftersGroup.position.y) * 0.10;
  if (roofWallPanelsExplosionList.length > 0) {
    roofWallPanelsExplosionList.forEach(panelG => {
      // Kaseta: lokalne −Z (na zewnątrz). Factor 1.
      panelG.position.z += (-targetWallsRadialExplode - panelG.position.z) * 0.10;
    });
  }
  if (roofLayerExplosions.length > 0) {
    roofLayerExplosions.forEach(layer => {
      const dist = targetWallsRadialExplode * layer.factor;
      layer.group.position.z += (-dist - layer.group.position.z) * 0.10;
    });
  }
  if (hexLayerExplosions.length > 0) {
    const span = targetHexWallsExplode;
    hexLayerExplosions.forEach(layer => {
      const dist = span * layer.factor;
      if (layer.axis === 'x') layer.group.position.x += (dist - layer.group.position.x) * 0.10;
      else layer.group.position.z += (-dist - layer.group.position.z) * 0.10;
    });
  }
  if (structureCamGoal && camera) {
    camera.position.lerp(structureCamGoal, 0.08);
    if (controls && structureTgtGoal) controls.target.lerp(structureTgtGoal, 0.08);
    if (camera.position.distanceTo(structureCamGoal) < 3) {
      structureCamGoal = null;
      structureTgtGoal = null;
    }
  }
  if (controls) controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("DOMContentLoaded", init);
