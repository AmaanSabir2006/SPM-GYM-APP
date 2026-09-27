import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'services/attendance_service.dart';

void main() {
  runApp(const GymTrackApp());
}

class GymTrackApp extends StatelessWidget {
  const GymTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GymTrack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE11D48),
          primary: const Color(0xFFE11D48),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isProcessing = false;

  void _openScanner() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => QRScannerScreen(
          onScanned: (token) {
            Navigator.of(context).pop();
            _processCheckIn(token);
          },
        ),
      ),
    );
  }

  Future<void> _processCheckIn(String token) async {
    setState(() => _isProcessing = true);
    final result = await AttendanceService.checkIn(token);
    setState(() => _isProcessing = false);

    if (!mounted) return;

    if (result['success'] == true) {
      _showResultDialog(
        title: 'Check-In Successful!',
        message: result['message'],
        isSuccess: true,
        icon: Icons.check_circle_outline,
        color: Colors.greenAccent,
      );
    } else if (result['type'] == 'duplicate') {
      _showResultDialog(
        title: 'Already Checked In',
        message: result['message'],
        isSuccess: false,
        icon: Icons.access_time,
        color: Colors.amberAccent,
      );
    } else {
      _showResultDialog(
        title: 'Check-In Failed',
        message: result['message'],
        isSuccess: false,
        icon: Icons.error_outline,
        color: Colors.redAccent,
      );
    }
  }

  void _showResultDialog({
    required String title,
    required String message,
    required bool isSuccess,
    required IconData icon,
    required Color color,
  }) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Text(
          message,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 15),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK', style: TextStyle(color: Color(0xFFE11D48), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GymTrack', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        centerTitle: true,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE11D48), width: 3),
                ),
                child: const Icon(Icons.fitness_center, size: 60, color: Color(0xFFE11D48)),
              ),
              const SizedBox(height: 32),
              const Text(
                'Welcome to GymTrack',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              const Text(
                'Scan the QR poster at the gym entrance to log your attendance.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 48),
              if (_isProcessing)
                const CircularProgressIndicator(color: Color(0xFFE11D48))
              else
                ElevatedButton.icon(
                  onPressed: _openScanner,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE11D48),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 4,
                  ),
                  icon: const Icon(Icons.qr_code_scanner, size: 28),
                  label: const Text(
                    'Scan Entrance QR',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class QRScannerScreen extends StatefulWidget {
  final Function(String) onScanned;

  const QRScannerScreen({super.key, required this.onScanned});

  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _hasScanned = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Entrance QR'),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              if (_hasScanned) return;
              final barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _hasScanned = true;
                  widget.onScanned(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFE11D48), width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
