import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { supabase } from '../supabase';

type PageBuilderScreenNavigationProp = NavigationProp<any, 'PageBuilder'>;

interface PageBuilderScreenProps {
  navigation: PageBuilderScreenNavigationProp;
}

interface CustomPage {
  id?: string;
  title: string;
  description: string;
  icon_name: string;
  screen_component: string;
  background_color: string;
  text_color: string;
  sort_order: number;
}

interface IconOption {
  name: string;
  label: string;
}

interface ScreenOption {
  component: string;
  label: string;
  description: string;
}

const ICON_OPTIONS: IconOption[] = [
  { name: 'document-text', label: 'Document' },
  { name: 'bar-chart', label: 'Analytics' },
  { name: 'car-sport', label: 'Vehicle' },
  { name: 'wallet', label: 'Finance' },
  { name: 'people', label: 'Users' },
  { name: 'settings', label: 'Settings' },
  { name: 'calendar', label: 'Calendar' },
  { name: 'location', label: 'Location' },
  { name: 'time', label: 'Time' },
  { name: 'calculator', label: 'Calculator' },
  { name: 'card', label: 'Card' },
  { name: 'clipboard', label: 'Reports' },
];

const SCREEN_OPTIONS: ScreenOption[] = [
  { component: 'DailyReportScreen', label: 'Daily Report', description: 'View daily performance reports' },
  { component: 'VehicleTrackingScreen', label: 'Vehicle Tracking', description: 'Track vehicle locations' },
  { component: 'FinancialSummaryScreen', label: 'Financial Summary', description: 'Financial analytics' },
  { component: 'UserManagementScreen', label: 'User Management', description: 'Manage users' },
  { component: 'InventoryScreen', label: 'Inventory', description: 'Manage inventory' },
  { component: 'CustomFormScreen', label: 'Custom Form', description: 'Custom data entry' },
];

const COLOR_OPTIONS = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', 
  '#F44336', '#00BCD4', '#795548', '#607D8B',
  '#E91E63', '#3F51B5', '#009688', '#8BC34A'
];

const PageBuilderScreen = ({ navigation }: PageBuilderScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  
  const [page, setPage] = useState<CustomPage>({
    title: '',
    description: '',
    icon_name: 'document-text',
    screen_component: 'DailyReportScreen',
    background_color: '#2196F3',
    text_color: '#FFFFFF',
    sort_order: 0,
  });
  
  const [loading, setLoading] = useState(false);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  const [screenModalVisible, setScreenModalVisible] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const handleSavePage = async () => {
    if (!page.title.trim()) {
      Alert.alert('Error', 'Please enter page title');
      return;
    }
    
    if (!page.description.trim()) {
      Alert.alert('Error', 'Please enter page description');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_pages')
        .insert([{
          title: page.title.trim(),
          description: page.description.trim(),
          icon_name: page.icon_name,
          screen_component: page.screen_component,
          background_color: page.background_color,
          text_color: page.text_color,
          sort_order: page.sort_order,
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving page:', error);
        Alert.alert('Error', 'Failed to save page');
        return;
      }

      console.log('✅ Page saved successfully:', data);
      Alert.alert(
        'Success',
        'Page created successfully! It will appear on the home screen.',
        [
          {
            text: 'OK',
            onPress: () => goBack()
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error saving page:', error);
      Alert.alert('Error', 'Failed to save page');
    } finally {
      setLoading(false);
    }
  };

  const renderIconItem = ({ item }: { item: IconOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        page.icon_name === item.name && styles.selectedOption
      ]}
      onPress={() => {
        setPage({ ...page, icon_name: item.name });
        setIconModalVisible(false);
      }}
    >
      <Icon name={item.name} size={24} color={page.icon_name === item.name ? '#2196F3' : '#666'} />
      <Text style={[
        styles.optionText,
        page.icon_name === item.name && styles.selectedOptionText
      ]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const renderScreenItem = ({ item }: { item: ScreenOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        page.screen_component === item.component && styles.selectedOption
      ]}
      onPress={() => {
        setPage({ ...page, screen_component: item.component });
        setScreenModalVisible(false);
      }}
    >
      <View style={styles.screenOption}>
        <Text style={[
          styles.optionText,
          page.screen_component === item.component && styles.selectedOptionText
        ]}>
          {item.label}
        </Text>
        <Text style={styles.optionDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderColorItem = (color: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.colorOption,
        { backgroundColor: color },
        page.background_color === color && styles.selectedColorOption
      ]}
      onPress={() => {
        setPage({ ...page, background_color: color });
        setColorModalVisible(false);
      }}
    >
      {page.background_color === color && (
        <Icon name="checkmark" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Page</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: page.background_color }]}>
            <Icon name={page.icon_name} size={32} color={page.text_color} />
            <Text style={[styles.previewTitle, { color: page.text_color }]}>
              {page.title || 'Page Title'}
            </Text>
            <Text style={[styles.previewDescription, { color: page.text_color, opacity: 0.8 }]}>
              {page.description || 'Page description'}
            </Text>
          </View>
        </View>

        {/* Page Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Page Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter page title..."
            value={page.title}
            onChangeText={(text) => setPage({ ...page, title: text })}
            maxLength={50}
          />
          <Text style={styles.charCount}>{page.title.length}/50</Text>
        </View>

        {/* Page Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            placeholder="Enter page description..."
            value={page.description}
            onChangeText={(text) => setPage({ ...page, description: text })}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{page.description.length}/200</Text>
        </View>

        {/* Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Icon</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setIconModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <Icon name={page.icon_name} size={24} color="#666" />
              <Text style={styles.selectorText}>
                {ICON_OPTIONS.find(opt => opt.name === page.icon_name)?.label}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Screen Component */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screen Component</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setScreenModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <Text style={styles.selectorText}>
                {SCREEN_OPTIONS.find(opt => opt.component === page.screen_component)?.label}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Background Color */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Color</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setColorModalVisible(true)}
          >
            <View style={styles.selectorContent}>
              <View style={[styles.colorPreview, { backgroundColor: page.background_color }]} />
              <Text style={styles.selectorText}>{page.background_color}</Text>
            </View>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Sort Order */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Order</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter display order (0-100)"
            value={page.sort_order.toString()}
            onChangeText={(text) => setPage({ ...page, sort_order: parseInt(text) || 0 })}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={styles.helperText}>Lower numbers appear first on home screen</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!page.title.trim() || !page.description.trim()) && styles.saveButtonDisabled
          ]}
          onPress={handleSavePage}
          disabled={loading || !page.title.trim() || !page.description.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Create Page</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Icon Selection Modal */}
      <Modal visible={iconModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIconModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Icon</Text>
            <View style={styles.placeholder} />
          </View>
          <FlatList
            data={ICON_OPTIONS}
            renderItem={renderIconItem}
            keyExtractor={(item) => item.name}
            numColumns={2}
            style={styles.modalList}
          />
        </View>
      </Modal>

      {/* Screen Selection Modal */}
      <Modal visible={screenModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setScreenModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Screen</Text>
            <View style={styles.placeholder} />
          </View>
          <FlatList
            data={SCREEN_OPTIONS}
            renderItem={renderScreenItem}
            keyExtractor={(item) => item.component}
            style={styles.modalList}
          />
        </View>
      </Modal>

      {/* Color Selection Modal */}
      <Modal visible={colorModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setColorModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Color</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((color, index) => renderColorItem(color, index))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  previewDescription: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalList: {
    flex: 1,
    padding: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flex: 1,
  },
  selectedOption: {
    borderColor: '#2196F3',
    backgroundColor: '#F3F9FF',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  selectedOptionText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  screenOption: {
    flex: 1,
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-around',
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});

export default PageBuilderScreen;