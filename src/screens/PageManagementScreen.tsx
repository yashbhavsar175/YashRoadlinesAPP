import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { supabase } from '../supabase';

type PageManagementScreenNavigationProp = NavigationProp<any, 'PageManagement'>;

interface PageManagementScreenProps {
  navigation: PageManagementScreenNavigationProp;
}

interface CustomPage {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  screen_component: string;
  background_color: string;
  text_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

const PageManagementScreen = ({ navigation }: PageManagementScreenProps): React.JSX.Element => {
  const { goBack } = navigation;
  
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('custom_pages')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading pages:', error);
        Alert.alert('Error', 'Failed to load pages');
        return;
      }

      setPages(data || []);
      console.log('✅ Loaded pages:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error loading pages:', error);
      Alert.alert('Error', 'Failed to load pages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_pages')
        .update({ is_active: !currentStatus })
        .eq('id', pageId);

      if (error) {
        console.error('❌ Error updating page status:', error);
        Alert.alert('Error', 'Failed to update page status');
        return;
      }

      // Update local state
      setPages(pages.map(page => 
        page.id === pageId 
          ? { ...page, is_active: !currentStatus }
          : page
      ));

      console.log('✅ Page status updated');
    } catch (error) {
      console.error('❌ Error updating page status:', error);
      Alert.alert('Error', 'Failed to update page status');
    }
  };

  const deletePage = async (pageId: string, pageTitle: string) => {
    Alert.alert(
      'Delete Page',
      `Are you sure you want to delete "${pageTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('custom_pages')
                .delete()
                .eq('id', pageId);

              if (error) {
                console.error('❌ Error deleting page:', error);
                Alert.alert('Error', 'Failed to delete page');
                return;
              }

              // Update local state
              setPages(pages.filter(page => page.id !== pageId));
              console.log('✅ Page deleted');
              Alert.alert('Success', 'Page deleted successfully');
            } catch (error) {
              console.error('❌ Error deleting page:', error);
              Alert.alert('Error', 'Failed to delete page');
            }
          }
        }
      ]
    );
  };

  const navigateToBuilder = () => {
    navigation.navigate('PageBuilder');
  };

  const navigateToPermissions = (pageId: string, pageTitle: string) => {
    navigation.navigate('PagePermissions', { pageId, pageTitle });
  };

  const renderPageItem = (page: CustomPage) => (
    <View key={page.id} style={styles.pageCard}>
      {/* Page Preview */}
      <View style={[styles.pagePreview, { backgroundColor: page.background_color }]}>
        <Icon name={page.icon_name} size={24} color={page.text_color} />
        <Text style={[styles.pageTitle, { color: page.text_color }]} numberOfLines={1}>
          {page.title}
        </Text>
      </View>

      {/* Page Details */}
      <View style={styles.pageDetails}>
        <Text style={styles.pageDescription} numberOfLines={2}>
          {page.description}
        </Text>
        <Text style={styles.pageComponent}>
          Component: {page.screen_component}
        </Text>
        <Text style={styles.pageOrder}>
          Display Order: {page.sort_order}
        </Text>
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: page.is_active ? '#4CAF50' : '#F44336' }
        ]}>
          <Text style={styles.statusText}>
            {page.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => togglePageStatus(page.id, page.is_active)}
        >
          <Icon 
            name={page.is_active ? 'pause' : 'play'} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.actionButtonText}>
            {page.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.permissionsButton]}
          onPress={() => navigateToPermissions(page.id, page.title)}
        >
          <Icon name="people" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deletePage(page.id, page.title)}
        >
          <Icon name="trash" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Page Management</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading pages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Page Management</Text>
        <TouchableOpacity onPress={navigateToBuilder} style={styles.addButton}>
          <Icon name="add" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPages(true)} />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pages.length}</Text>
            <Text style={styles.statLabel}>Total Pages</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pages.filter(p => p.is_active).length}</Text>
            <Text style={styles.statLabel}>Active Pages</Text>
          </View>
        </View>

        {/* Create New Page Button */}
        <TouchableOpacity style={styles.createButton} onPress={navigateToBuilder}>
          <Icon name="add-circle" size={24} color="#2196F3" />
          <Text style={styles.createButtonText}>Create New Page</Text>
          <Icon name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Pages List */}
        {pages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No Custom Pages</Text>
            <Text style={styles.emptyDescription}>
              Create your first custom page to get started
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={navigateToBuilder}>
              <Text style={styles.emptyButtonText}>Create Page</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pagesContainer}>
            <Text style={styles.sectionTitle}>All Pages ({pages.length})</Text>
            {pages.map(renderPageItem)}
          </View>
        )}
      </ScrollView>
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
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pagesContainer: {
    paddingBottom: 32,
  },
  pageCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  pagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  pageDetails: {
    padding: 16,
    paddingTop: 0,
  },
  pageDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  pageComponent: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  pageOrder: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  toggleButton: {
    backgroundColor: '#FF9800',
  },
  permissionsButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PageManagementScreen;