/**
 * P2P Service - Platform-specific offline file transfer
 * Android: WiFi Direct (P2P)
 * iOS: Multipeer Connectivity
 */

import { Platform, NativeModules, NativeEventEmitter, PermissionsAndroid } from 'react-native';

// Types
export interface PeerDevice {
  id: string;
  name: string;
  address?: string;
  status: 'available' | 'connecting' | 'connected' | 'disconnected';
}

export interface TransferProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
}

export interface P2PServiceInterface {
  isSupported: () => Promise<boolean>;
  initialize: () => Promise<boolean>;
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => Promise<void>;
  startAdvertising: (deviceName: string) => Promise<void>;
  stopAdvertising: () => Promise<void>;
  connectToPeer: (peerId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendFile: (filePath: string, fileName: string, fileSize: number) => Promise<void>;
  onPeersFound: (callback: (peers: PeerDevice[]) => void) => void;
  onConnectionChange: (callback: (status: string, peer?: PeerDevice) => void) => void;
  onFileReceived: (callback: (fileName: string, filePath: string, fileSize: number) => void) => void;
  onTransferProgress: (callback: (progress: TransferProgress) => void) => void;
  cleanup: () => void;
}

// Mock service for web/unsupported platforms
class MockP2PService implements P2PServiceInterface {
  async isSupported() { return false; }
  async initialize() { return false; }
  async startDiscovery() {}
  async stopDiscovery() {}
  async startAdvertising() {}
  async stopAdvertising() {}
  async connectToPeer() { return false; }
  async disconnect() {}
  async sendFile() {}
  onPeersFound() {}
  onConnectionChange() {}
  onFileReceived() {}
  onTransferProgress() {}
  cleanup() {}
}

// Android WiFi Direct Service
class AndroidWiFiDirectService implements P2PServiceInterface {
  private WifiP2P: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private subscriptions: any[] = [];
  private peersCallback: ((peers: PeerDevice[]) => void) | null = null;
  private connectionCallback: ((status: string, peer?: PeerDevice) => void) | null = null;
  private fileReceivedCallback: ((fileName: string, filePath: string, fileSize: number) => void) | null = null;
  private progressCallback: ((progress: TransferProgress) => void) | null = null;

  constructor() {
    try {
      this.WifiP2P = NativeModules.WifiP2P || require('react-native-wifi-p2p').default;
    } catch (e) {
      console.log('WiFi P2P module not available:', e);
    }
  }

  async isSupported(): Promise<boolean> {
    if (!this.WifiP2P) return false;
    
    try {
      // Check if device supports WiFi Direct
      const supported = await this.WifiP2P.isSupported?.() ?? true;
      return supported;
    } catch (e) {
      console.log('WiFi Direct support check failed:', e);
      return false;
    }
  }

  async initialize(): Promise<boolean> {
    if (!this.WifiP2P) return false;

    try {
      // Request required permissions for Android
      const granted = await this.requestPermissions();
      if (!granted) return false;

      // Initialize WiFi P2P
      await this.WifiP2P.initialize();
      
      // Setup event listeners
      this.setupEventListeners();
      
      return true;
    } catch (e) {
      console.log('WiFi Direct initialization failed:', e);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      // Android 13+ requires NEARBY_WIFI_DEVICES
      if (Platform.Version >= 33) {
        permissions.push('android.permission.NEARBY_WIFI_DEVICES' as any);
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      return Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (e) {
      console.log('Permission request failed:', e);
      return false;
    }
  }

  private setupEventListeners() {
    if (!this.WifiP2P) return;

    try {
      this.eventEmitter = new NativeEventEmitter(this.WifiP2P);

      // Peers discovered
      this.subscriptions.push(
        this.eventEmitter.addListener('PEERS_UPDATED', (event: any) => {
          const peers: PeerDevice[] = (event.peers || []).map((p: any) => ({
            id: p.deviceAddress || p.id,
            name: p.deviceName || p.name || 'Unknown Device',
            address: p.deviceAddress,
            status: p.status === 0 ? 'connected' : 'available',
          }));
          this.peersCallback?.(peers);
        })
      );

      // Connection changed
      this.subscriptions.push(
        this.eventEmitter.addListener('CONNECTION_INFO_UPDATED', (event: any) => {
          const status = event.isGroupOwner ? 'host' : (event.groupFormed ? 'connected' : 'disconnected');
          this.connectionCallback?.(status, {
            id: event.groupOwnerAddress || 'host',
            name: 'Connected Device',
            status: 'connected',
          });
        })
      );

      // File received
      this.subscriptions.push(
        this.eventEmitter.addListener('FILE_RECEIVED', (event: any) => {
          this.fileReceivedCallback?.(event.fileName, event.filePath, event.fileSize);
        })
      );

      // Transfer progress
      this.subscriptions.push(
        this.eventEmitter.addListener('TRANSFER_PROGRESS', (event: any) => {
          this.progressCallback?.({
            fileId: event.fileId,
            fileName: event.fileName,
            progress: event.progress,
            status: event.status,
          });
        })
      );
    } catch (e) {
      console.log('Event listener setup failed:', e);
    }
  }

  async startDiscovery(): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      await this.WifiP2P.discoverPeers();
    } catch (e) {
      console.log('Discovery failed:', e);
      throw e;
    }
  }

  async stopDiscovery(): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      await this.WifiP2P.stopPeerDiscovery?.();
    } catch (e) {
      console.log('Stop discovery failed:', e);
    }
  }

  async startAdvertising(deviceName: string): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      // In WiFi Direct, creating a group makes this device discoverable
      await this.WifiP2P.createGroup();
    } catch (e) {
      console.log('Start advertising failed:', e);
      throw e;
    }
  }

  async stopAdvertising(): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      await this.WifiP2P.removeGroup();
    } catch (e) {
      console.log('Stop advertising failed:', e);
    }
  }

  async connectToPeer(peerId: string): Promise<boolean> {
    if (!this.WifiP2P) return false;
    try {
      await this.WifiP2P.connect(peerId);
      return true;
    } catch (e) {
      console.log('Connect to peer failed:', e);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      await this.WifiP2P.disconnect();
      await this.WifiP2P.removeGroup();
    } catch (e) {
      console.log('Disconnect failed:', e);
    }
  }

  async sendFile(filePath: string, fileName: string, fileSize: number): Promise<void> {
    if (!this.WifiP2P) return;
    try {
      // Get connection info to find the host address
      const connectionInfo = await this.WifiP2P.getConnectionInfo();
      const hostAddress = connectionInfo.groupOwnerAddress;
      
      // Send file to the host
      await this.WifiP2P.sendFile(filePath, hostAddress);
    } catch (e) {
      console.log('Send file failed:', e);
      throw e;
    }
  }

  onPeersFound(callback: (peers: PeerDevice[]) => void) {
    this.peersCallback = callback;
  }

  onConnectionChange(callback: (status: string, peer?: PeerDevice) => void) {
    this.connectionCallback = callback;
  }

  onFileReceived(callback: (fileName: string, filePath: string, fileSize: number) => void) {
    this.fileReceivedCallback = callback;
  }

  onTransferProgress(callback: (progress: TransferProgress) => void) {
    this.progressCallback = callback;
  }

  cleanup() {
    this.subscriptions.forEach(sub => sub?.remove?.());
    this.subscriptions = [];
    this.peersCallback = null;
    this.connectionCallback = null;
    this.fileReceivedCallback = null;
    this.progressCallback = null;
  }
}

// iOS Multipeer Connectivity Service
class iOSMultipeerService implements P2PServiceInterface {
  private Multipeer: any = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private subscriptions: any[] = [];
  private peersCallback: ((peers: PeerDevice[]) => void) | null = null;
  private connectionCallback: ((status: string, peer?: PeerDevice) => void) | null = null;
  private fileReceivedCallback: ((fileName: string, filePath: string, fileSize: number) => void) | null = null;
  private progressCallback: ((progress: TransferProgress) => void) | null = null;

  constructor() {
    try {
      this.Multipeer = NativeModules.MultipeerConnectivity || require('react-native-multipeer-connectivity').default;
    } catch (e) {
      console.log('Multipeer module not available:', e);
    }
  }

  async isSupported(): Promise<boolean> {
    return this.Multipeer !== null;
  }

  async initialize(): Promise<boolean> {
    if (!this.Multipeer) return false;

    try {
      // Initialize multipeer session
      await this.Multipeer.initialize?.('QuickShare');
      this.setupEventListeners();
      return true;
    } catch (e) {
      console.log('Multipeer initialization failed:', e);
      return false;
    }
  }

  private setupEventListeners() {
    if (!this.Multipeer) return;

    try {
      this.eventEmitter = new NativeEventEmitter(this.Multipeer);

      // Peer found
      this.subscriptions.push(
        this.eventEmitter.addListener('peerFound', (event: any) => {
          this.peersCallback?.([{
            id: event.peerId,
            name: event.peerName || 'iOS Device',
            status: 'available',
          }]);
        })
      );

      // Peer lost
      this.subscriptions.push(
        this.eventEmitter.addListener('peerLost', (event: any) => {
          // Handle peer lost
        })
      );

      // Connection state changed
      this.subscriptions.push(
        this.eventEmitter.addListener('stateChanged', (event: any) => {
          const statusMap: Record<number, string> = {
            0: 'disconnected',
            1: 'connecting',
            2: 'connected',
          };
          this.connectionCallback?.(statusMap[event.state] || 'unknown', {
            id: event.peerId,
            name: event.peerName,
            status: statusMap[event.state] as any || 'available',
          });
        })
      );

      // Data received
      this.subscriptions.push(
        this.eventEmitter.addListener('dataReceived', (event: any) => {
          this.fileReceivedCallback?.(event.fileName, event.filePath, event.fileSize);
        })
      );
    } catch (e) {
      console.log('Event listener setup failed:', e);
    }
  }

  async startDiscovery(): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.browse?.();
    } catch (e) {
      console.log('Browse failed:', e);
      throw e;
    }
  }

  async stopDiscovery(): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.stopBrowsing?.();
    } catch (e) {
      console.log('Stop browsing failed:', e);
    }
  }

  async startAdvertising(deviceName: string): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.advertise?.(deviceName);
    } catch (e) {
      console.log('Advertise failed:', e);
      throw e;
    }
  }

  async stopAdvertising(): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.stopAdvertising?.();
    } catch (e) {
      console.log('Stop advertising failed:', e);
    }
  }

  async connectToPeer(peerId: string): Promise<boolean> {
    if (!this.Multipeer) return false;
    try {
      await this.Multipeer.invite?.(peerId);
      return true;
    } catch (e) {
      console.log('Invite peer failed:', e);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.disconnect?.();
    } catch (e) {
      console.log('Disconnect failed:', e);
    }
  }

  async sendFile(filePath: string, fileName: string, fileSize: number): Promise<void> {
    if (!this.Multipeer) return;
    try {
      await this.Multipeer.sendFile?.(filePath);
    } catch (e) {
      console.log('Send file failed:', e);
      throw e;
    }
  }

  onPeersFound(callback: (peers: PeerDevice[]) => void) {
    this.peersCallback = callback;
  }

  onConnectionChange(callback: (status: string, peer?: PeerDevice) => void) {
    this.connectionCallback = callback;
  }

  onFileReceived(callback: (fileName: string, filePath: string, fileSize: number) => void) {
    this.fileReceivedCallback = callback;
  }

  onTransferProgress(callback: (progress: TransferProgress) => void) {
    this.progressCallback = callback;
  }

  cleanup() {
    this.subscriptions.forEach(sub => sub?.remove?.());
    this.subscriptions = [];
    this.peersCallback = null;
    this.connectionCallback = null;
    this.fileReceivedCallback = null;
    this.progressCallback = null;
  }
}

// Factory to get platform-specific service
export function getP2PService(): P2PServiceInterface {
  if (Platform.OS === 'android') {
    return new AndroidWiFiDirectService();
  } else if (Platform.OS === 'ios') {
    return new iOSMultipeerService();
  } else {
    return new MockP2PService();
  }
}

// Singleton instance
let p2pServiceInstance: P2PServiceInterface | null = null;

export function useP2PService(): P2PServiceInterface {
  if (!p2pServiceInstance) {
    p2pServiceInstance = getP2PService();
  }
  return p2pServiceInstance;
}

export default {
  getP2PService,
  useP2PService,
};
