const { execSync } = require('child_process');

function applyScreenCaptureProtection(hwnd) {
  try {
    // Create a temporary C# executable to apply protection
    const csharpCode = `
using System;
using System.Runtime.InteropServices;

class Program {
    [DllImport("user32.dll")]
    static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);
    
    [DllImport("user32.dll")]
    static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    
    [DllImport("user32.dll")]
    static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    
    [DllImport("dwmapi.dll")]
    static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    static void Main(string[] args) {
        if (args.Length == 0) return;
        
        IntPtr hwnd = new IntPtr(long.Parse(args[0]));
        
        // Method 1: SetWindowDisplayAffinity
        SetWindowDisplayAffinity(hwnd, 0x11);
        
        // Method 2: WS_EX_TOOLWINDOW
        int GWL_EXSTYLE = -20;
        int WS_EX_TOOLWINDOW = 0x80;
        int currentStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
        SetWindowLong(hwnd, GWL_EXSTYLE, currentStyle | WS_EX_TOOLWINDOW);
        
        // Method 3: DWM Cloaking
        int DWMWA_CLOAKED = 14;
        int value = 1;
        DwmSetWindowAttribute(hwnd, DWMWA_CLOAKED, ref value, 4);
    }
}`;

    // Write C# code to temp file
    const fs = require('fs');
    const path = require('path');
    const tempDir = require('os').tmpdir();
    const csFile = path.join(tempDir, 'protection.cs');
    const exeFile = path.join(tempDir, 'protection.exe');
    
    fs.writeFileSync(csFile, csharpCode);
    
    // Compile C# code
    execSync(`csc /out:"${exeFile}" "${csFile}"`, { stdio: 'ignore' });
    
    // Execute protection
    execSync(`"${exeFile}" ${hwnd}`, { stdio: 'ignore' });
    
    // Cleanup
    try {
      fs.unlinkSync(csFile);
      fs.unlinkSync(exeFile);
    } catch (e) {}
    
    return true;
  } catch (error) {
    console.log('C# protection failed, trying PowerShell...');
    return false;
  }
}

module.exports = { applyScreenCaptureProtection };