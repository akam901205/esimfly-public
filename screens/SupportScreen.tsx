import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';
import { useToast } from '../components/ToastNotification';

const { width } = Dimensions.get('window');

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: FAQItem[];
}

interface SelectedFile {
  name: string;
  size: number;
  uri: string;
  type: string;
}

const SupportScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<SelectedFile[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const subjectOptions = [
    'General Inquiry',
    'eSIM Activation Issue',
    'Connectivity Problem',
    'Billing Question',
    'Account Issue',
    'Technical Support',
    'Other',
  ];

  const faqCategories: FAQCategory[] = [
    {
      title: 'Getting Started',
      icon: 'rocket-outline',
      items: [
        {
          question: 'What is an eSIM?',
          answer: 'An eSIM (embedded SIM) is a digital SIM that allows you to activate a cellular plan from your carrier without having to use a physical SIM card. It\'s built into your device and can be programmed to connect to any supported carrier\'s network.',
        },
        {
          question: 'How do I activate my eSIM?',
          answer: 'To activate your eSIM, go to your eSIMs page in the app, select the eSIM you want to activate, and follow the activation instructions. You\'ll need to scan the QR code with your device camera or enter the activation details manually.',
        },
        {
          question: 'Which devices support eSIM?',
          answer: 'Most modern smartphones and tablets support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many iPad models. Check your device specifications to confirm eSIM compatibility.',
        },
      ],
    },
    {
      title: 'Account & Billing',
      icon: 'card-outline',
      items: [
        {
          question: 'How do I update my payment method?',
          answer: 'To update your payment method, go to the Profile section in your app, select Payment Methods, and tap \'Add New Payment Method\'. Once added, you can set it as your default payment method.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept major credit cards (Visa, Mastercard, American Express), and in some regions, Apple Pay and Google Pay.',
        },
        {
          question: 'How can I get an invoice for my purchase?',
          answer: 'Invoices for all your purchases are automatically generated and available in the Order History section of your app. You can view them there.',
        },
      ],
    },
    {
      title: 'Troubleshooting',
      icon: 'build-outline',
      items: [
        {
          question: 'My eSIM is not connecting to the network',
          answer: 'First, ensure your device is eSIM compatible and that the eSIM is properly activated. Check if mobile data is enabled in your settings. Try restarting your device. If the issue persists, contact our support team.',
        },
        {
          question: 'I can\'t activate my eSIM',
          answer: 'Make sure your device is connected to the internet via Wi-Fi when trying to activate your eSIM. Also, verify that your device is eSIM compatible and that you\'re following the correct activation steps for your specific device model.',
        },
        {
          question: 'How do I check my eSIM data usage?',
          answer: 'You can check your eSIM data usage in the app under the eSIMs section. Select the specific eSIM to view detailed usage statistics. Many devices also show eSIM data usage in the cellular data settings.',
        },
      ],
    },
    {
      title: 'Data Plans',
      icon: 'globe-outline',
      items: [
        {
          question: 'Can I extend my data plan?',
          answer: 'Yes, you can extend most data plans before they expire. Go to your eSIMs page, select the active eSIM, and look for the \'Top Up\' option. Note that some regional plans may have extension limitations.',
        },
        {
          question: 'What happens when my data runs out?',
          answer: 'When your data allocation is depleted, your eSIM will no longer provide data connectivity unless you purchase additional data. You\'ll receive notifications as you approach your data limit.',
        },
        {
          question: 'Do unused data allocations roll over?',
          answer: 'No, unused data does not roll over when a plan expires. We recommend selecting a plan that matches your expected usage needs.',
        },
      ],
    },
  ];

  const filteredFAQCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(
      item =>
        searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.items.length > 0);

  const toggleFAQ = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        multiple: false, // Set to false for now as multiple might not work correctly
        copyToCacheDirectory: true,
      });

      // Check if canceled
      if (result.canceled) {
        return;
      }

      // Get the first asset from the assets array
      const asset = result.assets[0];
      console.log('Document picker result:', result);
      console.log('Selected asset:', asset);
      
      if (asset) {
        const newFile: SelectedFile = {
          name: asset.name,
          size: asset.size || 0,
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
        };

        console.log('Created file object:', newFile);

        // Check file size (5MB limit)
        if (newFile.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select files smaller than 5MB');
          return;
        }

        setAttachments([...attachments, newFile]);
        console.log('Updated attachments:', [...attachments, newFile]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const removeAttachment = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async () => {
    if (!selectedSubject) {
      Alert.alert('Missing Subject', 'Please select a subject for your message');
      return;
    }

    if (!message || message.length < 10) {
      Alert.alert('Message Too Short', 'Please provide a detailed message (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const formData = new FormData();
      formData.append('subject', selectedSubject);
      formData.append('message', message);

      // Add attachments
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      });

      const response = await newApi.post('/support', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Support request sent successfully');
        // Reset form
        setSelectedSubject('');
        setMessage('');
        setAttachments([]);
        setActiveTab('faq');
      } else {
        throw new Error(response.data.error || 'Failed to send support request');
      }
    } catch (error: any) {
      console.error('Error sending support request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let errorMessage = 'Failed to send support request. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('faq');
          }}
        >
          <Ionicons
            name="help-circle-outline"
            size={20}
            color={activeTab === 'faq' ? '#333' : colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('contact');
          }}
        >
          <Ionicons
            name="mail-outline"
            size={20}
            color={activeTab === 'contact' ? '#333' : colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>
            Contact Support
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'faq' ? (
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for answers..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchQuery('');
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* FAQ Categories */}
          {filteredFAQCategories.map((category, categoryIndex) => (
            <View key={categoryIndex} style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons name={category.icon} size={24} color="#333" />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>

              {category.items.map((item, itemIndex) => {
                const itemId = `${categoryIndex}-${itemIndex}`;
                const isExpanded = expandedFAQ === itemId;

                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.faqItem}
                    onPress={() => toggleFAQ(itemId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={styles.faqQuestion}>{item.question}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.text.secondary}
                      />
                    </View>
                    {isExpanded && (
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {filteredFAQCategories.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            <View style={styles.contactForm}>
              <Text style={styles.formTitle}>Send us a message</Text>
              <Text style={styles.formDescription}>
                We'll get back to you as soon as possible
              </Text>

              {/* Subject Picker */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Subject</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSubjectPicker(!showSubjectPicker);
                  }}
                >
                  <Text style={[
                    styles.selectButtonText,
                    selectedSubject && styles.selectButtonTextSelected
                  ]}>
                    {selectedSubject || 'Select a subject'}
                  </Text>
                  <Ionicons
                    name={showSubjectPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>

                {showSubjectPicker && (
                  <View style={styles.pickerContainer}>
                    {subjectOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.pickerItem}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedSubject(option);
                          setShowSubjectPicker(false);
                        }}
                      >
                        <Text style={styles.pickerItemText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Message Input */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor={colors.text.secondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Attachments */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Attachments (Optional)</Text>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handleSelectFile}
                >
                  <Ionicons name="attach" size={20} color="#333" />
                  <Text style={styles.attachButtonText}>Add Attachment</Text>
                </TouchableOpacity>

                {attachments.map((file, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Ionicons name="document" size={20} color="#333" />
                    <View style={styles.attachmentInfo}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.attachmentSize}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeAttachment(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.light,
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#333',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'Quicksand-SemiBold',
  },
  activeTabText: {
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand-SemiBold',
  },
  faqItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Medium',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
    marginTop: 12,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    fontFamily: 'Quicksand-SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    fontFamily: 'Quicksand-Regular',
  },
  contactForm: {
    paddingTop: 20,
    paddingBottom: 100, // Increased to account for tab bar
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Medium',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  selectButtonTextSelected: {
    color: colors.text.primary,
  },
  pickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
  },
  messageInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  attachButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Quicksand-SemiBold',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Medium',
  },
  attachmentSize: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  removeButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Quicksand-SemiBold',
  },
});

export default SupportScreen;