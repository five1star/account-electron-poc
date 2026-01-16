const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  const platform = packager.platform.name;
  
  console.log('After pack hook - Platform:', platform, 'Electron Platform:', electronPlatformName);
  
  // better-sqlite3 네이티브 모듈 경로 확인
  const betterSqlite3Path = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(betterSqlite3Path)) {
    console.log('better-sqlite3 found in asar.unpacked');
    
    // 빌드된 네이티브 모듈 확인
    const buildPath = path.join(betterSqlite3Path, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
      console.log('better-sqlite3 native module found at:', buildPath);
      
      // 파일 목록 출력 (디버깅용)
      try {
        const files = fs.readdirSync(buildPath);
        console.log('Native module files:', files);
        
        // .node 파일 확인
        const nodeFiles = files.filter(f => f.endsWith('.node'));
        if (nodeFiles.length > 0) {
          console.log('Found .node files:', nodeFiles);
          // 파일 권한 확인
          nodeFiles.forEach(file => {
            const filePath = path.join(buildPath, file);
            const stats = fs.statSync(filePath);
            console.log(`File: ${file}, Size: ${stats.size}, Executable: ${(stats.mode & parseInt('111', 8)) !== 0}`);
          });
        } else {
          console.warn('No .node files found in build/Release');
        }
      } catch (err) {
        console.error('Error reading build directory:', err);
      }
    } else {
      console.warn('better-sqlite3 build directory not found at:', buildPath);
      
      // 다른 가능한 경로 확인
      const altBuildPath = path.join(betterSqlite3Path, 'build');
      if (fs.existsSync(altBuildPath)) {
        console.log('Found build directory at:', altBuildPath);
        const subdirs = fs.readdirSync(altBuildPath);
        console.log('Build subdirectories:', subdirs);
      }
    }
    
    // lib 디렉토리 확인
    const libPath = path.join(betterSqlite3Path, 'lib');
    if (fs.existsSync(libPath)) {
      console.log('better-sqlite3 lib directory found');
      const libFiles = fs.readdirSync(libPath);
      console.log('Lib files:', libFiles);
    }
  } else {
    console.warn('better-sqlite3 not found in asar.unpacked at:', betterSqlite3Path);
    
    // asar 내부 확인
    const asarPath = path.join(appOutDir, 'resources', 'app.asar');
    if (fs.existsSync(asarPath)) {
      console.log('Checking if better-sqlite3 is in asar...');
      try {
        const result = execSync(`npx asar list "${asarPath}" | grep better-sqlite3 | head -5`, { encoding: 'utf8', stdio: 'pipe' });
        if (result) {
          console.log('Found better-sqlite3 references in asar:', result);
        }
      } catch (err) {
        // asar가 없거나 grep 실패는 정상일 수 있음
      }
    }
  }
  
  // 전체 node_modules 구조 확인
  const nodeModulesPath = path.join(appOutDir, 'resources', 'app.asar.unpacked', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const modules = fs.readdirSync(nodeModulesPath);
    console.log('Unpacked node_modules:', modules.filter(m => m.includes('sqlite') || m.includes('better')));
  }
};
