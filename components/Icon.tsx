/**
 * Icon Component - Uses Lucide React Native for cross-platform SVG icons
 * Works perfectly on Web (PWA), iOS, and Android without font loading
 */
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  // Common icons used throughout the app
  Home,
  User,
  Calendar,
  Heart,
  Droplet,
  Users,
  MapPin,
  Phone,
  Mail,
  Search,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Camera,
  Image as ImageIcon,
  Upload,
  Download,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Star,
  Award,
  Trophy,
  Gift,
  Clock,
  History,
  QrCode,
  Building2,
  Hospital,
  UserPlus,
  UserCheck,
  Newspaper,
  FileText,
  List,
  Grid,
  Filter,
  RefreshCw,
  Send,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Copy,
  CheckSquare,
  Square,
  Circle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  LogIn,
  UserMinus,
  Activity,
  TrendingUp,
  BarChart,
  PieChart,
} from 'lucide-react-native';

// Icon mapping for easier usage
const iconMap = {
  // Navigation
  home: Home,
  back: ChevronLeft,
  forward: ChevronRight,
  up: ChevronUp,
  down: ChevronDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  menu: Menu,
  close: X,
  
  // User & Auth
  person: User,
  'person-add': UserPlus,
  'person-check': UserCheck,
  'person-remove': UserMinus,
  login: LogIn,
  logout: LogOut,
  lock: Lock,
  unlock: Unlock,
  
  // Blood & Health
  droplet: Droplet,
  heart: Heart,
  'heart-outline': Heart,
  activity: Activity,
  hospital: Hospital,
  
  // General
  calendar: Calendar,
  'calendar-outline': Calendar,
  people: Users,
  location: MapPin,
  'location-outline': MapPin,
  call: Phone,
  mail: Mail,
  search: Search,
  settings: Settings,
  'settings-outline': Settings,
  notifications: Bell,
  'notifications-outline': Bell,
  
  // Actions
  add: Plus,
  'add-circle': Plus,
  remove: Minus,
  'remove-circle': Minus,
  create: Edit,
  pencil: Edit,
  trash: Trash2,
  'trash-outline': Trash2,
  save: Save,
  'save-outline': Save,
  camera: Camera,
  'camera-outline': Camera,
  image: ImageIcon,
  'image-outline': ImageIcon,
  upload: Upload,
  download: Download,
  share: Share2,
  'share-outline': Share2,
  eye: Eye,
  'eye-off': EyeOff,
  send: Send,
  'send-outline': Send,
  
  // Status
  checkmark: Check,
  'checkmark-circle': CheckCircle,
  'close-circle': XCircle,
  alert: AlertCircle,
  'alert-circle': AlertCircle,
  information: Info,
  'information-circle': Info,
  help: HelpCircle,
  'help-circle': HelpCircle,
  
  // Ratings & Achievements
  star: Star,
  'star-outline': Star,
  award: Award,
  trophy: Trophy,
  ribbon: Award,
  gift: Gift,
  
  // Time
  time: Clock,
  'time-outline': Clock,
  history: History,
  
  // Content
  qr: QrCode,
  'qr-code': QrCode,
  business: Building2,
  building: Building2,
  newspaper: Newspaper,
  'newspaper-outline': Newspaper,
  document: FileText,
  'document-text': FileText,
  list: List,
  'list-outline': List,
  grid: Grid,
  'grid-outline': Grid,
  
  // Functions
  filter: Filter,
  'filter-outline': Filter,
  refresh: RefreshCw,
  'refresh-outline': RefreshCw,
  
  // Communication
  chatbox: MessageSquare,
  'chatbox-outline': MessageSquare,
  'thumbs-up': ThumbsUp,
  'thumbs-down': ThumbsDown,
  
  // Miscellaneous
  'open-outline': ExternalLink,
  copy: Copy,
  'copy-outline': Copy,
  'checkbox': CheckSquare,
  'checkbox-outline': Square,
  'radio-button-on': CheckCircle,
  'radio-button-off': Circle,
  
  // Charts & Analytics
  chart: BarChart,
  'bar-chart': BarChart,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  stats: Activity,
};

export type IconName = keyof typeof iconMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Icon component - Renders Lucide icons with Ionicons-like API
 * @param name - Icon name from the iconMap
 * @param size - Icon size in pixels (default: 24)
 * @param color - Icon color (default: currentColor)
 * @param style - Additional styles
 */
export default function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }
  
  return <IconComponent size={size} color={color} style={style} />;
}

// Named exports for direct usage
export {
  Home,
  User,
  Calendar,
  Heart,
  Droplet,
  Users,
  MapPin,
  Phone,
  Mail,
  Search,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Camera,
  ImageIcon,
  Upload,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Check,
  CheckCircle,
  AlertCircle,
  Info,
  Star,
  Trophy,
  Clock,
  History,
  QrCode,
  Hospital,
  UserPlus,
  Newspaper,
  FileText,
  List,
  Filter,
  RefreshCw,
  MessageSquare,
  ExternalLink,
};
