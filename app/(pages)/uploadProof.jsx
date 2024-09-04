import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import fonts from '../../constants/fonts';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import apiClient from '../../src/api/apiClient';

const UploadProof = () => {
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [cameraActive, setIsCameraActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const uploadIntervals = useRef({});
    const [filesSelected, setFilesSelected] = React.useState(false);
    const handleFileUpload = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
      
        if (!result.canceled) {
            setFilesSelected(true);
            const newFile = { uri: result.assets[0].uri, name: result.assets[0].fileName || 'unknown_file', progress: 0, status: 'uploading' };
            setUploadedFiles([...uploadedFiles, newFile]);
            setUploading(true);

            // Simulate the file upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setUploadedFiles((prevFiles) =>
                    prevFiles.map((file) =>
                        file.name === newFile.name ? { ...file, progress } : file
                    )
                );

                if (progress >= 100) {
                    clearInterval(interval);
                    setUploadedFiles((prevFiles) =>
                        prevFiles.map((file) =>
                            file.name === newFile.name ? { ...file, status: 'success', progress: 100 } : file
                        )
                    );
                    setUploading(false);

                    // Send the file to the API after upload is complete
                    uploadFileToAPI(newFile);
                }
            }, 500);

            uploadIntervals.current[newFile.name] = interval;
        }else{
            setFilesSelected(false);
        }
    };

    const handleCameraUpload = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Camera permission is required to use this feature.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            const newFile = { uri: result.uri, name: result.uri.split('/').pop(), progress: 0, status: 'uploading' };
            setUploadedFiles([...uploadedFiles, newFile]);
            setUploading(true);

            // Simulate the file upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setUploadedFiles((prevFiles) =>
                    prevFiles.map((file) =>
                        file.name === newFile.name ? { ...file, progress } : file
                    )
                );

                if (progress >= 100) {
                    clearInterval(interval);
                    setUploadedFiles((prevFiles) =>
                        prevFiles.map((file) =>
                            file.name === newFile.name ? { ...file, status: 'success', progress: 100 } : file
                        )
                    );
                    setUploading(false);

                    // Send the file to the API after upload is complete
                    uploadFileToAPI(newFile);
                }
            }, 500);

            uploadIntervals.current[newFile.name] = interval;
        }
    };

    const uploadFileToAPI = async (file) => {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: 'image/jpeg', // Adjust this dynamically based on the file type if necessary
        });

        try {
            const response = await apiClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.status === 200) {
                console.log('File uploaded successfully:', response.data);
                // Handle successful response (e.g., updating state with the uploaded file info)
            } else {
                console.log('Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const closeCamera = () => {
        setIsCameraActive(false);
    };

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            Object.values(uploadIntervals.current).forEach(clearInterval);
        };
    }, [stream]);

    const handleRemoveFile = (fileName) => {
        if (uploadIntervals.current[fileName]) {
            clearInterval(uploadIntervals.current[fileName]);
            delete uploadIntervals.current[fileName];
        }

        setUploadedFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    };



    const uploadDisabled = uploading;
    const anyUploading = uploadedFiles.some(file => file.status === 'uploading');
    return (
        <SafeAreaView>
            <ScrollView>
                <View style={styles.mainContainer}>
                    <Text style={styles.instructions}>1. Upload your proof of work</Text>
                    <View style={styles.uploadContainer}>
                        <Text style={styles.uploadText}>Upload your proof of work in .png or .jpeg format</Text>

                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handleFileUpload}
                            disabled={anyUploading || uploadDisabled}
                        >
                            <Text style={styles.buttonText}>Browse files</Text>
                        </TouchableOpacity>

                        <Text style={styles.orText}>OR</Text>

                        {cameraActive ? (
                            <TouchableOpacity style={styles.uploadButton} onPress={closeCamera}>
                                <Text style={styles.buttonText}>Close Camera</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handleCameraUpload}
                                disabled={anyUploading || uploadDisabled}
                            >
                                <Text style={styles.buttonText}>Use Camera</Text>
                            </TouchableOpacity>
                        )}

                        {Platform.OS === 'web' && cameraActive && (
                            <View style={styles.cameraContainer}>
                                <video ref={videoRef} style={styles.videoPreview} autoPlay muted />
                            </View>
                        )}

                        {uploadedFiles.map((file, index) => (
                            <View key={index} style={styles.fileRow}>
                                <FontAwesome name="file" size={24} color="#6B7280" />
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.docNameContainer}>
                                        <Text style={styles.fileName}>{file?.name}</Text>
                                        {file.status === 'success' ? (
                                            <FontAwesome name="check-circle" size={15} color="#A3D65C" />
                                        ) : file.status === 'uploading' ? (
                                            <Text style={{ color: '#838383', fontSize: 10 }}>{`${file.progress}%`}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.progressBackground}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                {
                                                    width: `${file.progress}%`,
                                                    backgroundColor: file.status === 'success' ? '#A3D65C' : '#FFD439',
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveFile(file.name)}>
                                    <FontAwesome style={{ marginTop: 15 }} name="trash" size={15} color="#FC5275" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Conditionally render the upload status button */}
                        {filesSelected && (
                            <View>
                                <TouchableOpacity
                                    style={styles.uploadStatusButton}
                                
                                    disabled={anyUploading || uploadDisabled}
                                >
                                    <Text style={{ color: '#3B82F6' }}>
                                        {anyUploading ? 'Uploading...' : 'Upload All'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <Text style={styles.instructions}>2.supervisor’s Approval</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default UploadProof;

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        padding: 15,
        paddingTop: 20,
    },
    instructions: {
        fontSize: 18,
        fontFamily: fonts.WorkSans600,
        paddingBottom: 10,
    },
    uploadContainer: {
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#8D8D8D',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginBottom: 16,
        height: 'auto',
        paddingBottom: 60,
    },
    uploadText: {
        textAlign: 'center',
        marginBottom: 16,
        marginTop: 20,
        color: '#4B5563',
    },
    uploadButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 16,
        height: 39,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    orText: {
        color: '#6B7280',
        marginBottom: 16,
    },
    cameraContainer: {
        width: '100%',
        height: 'auto',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoPreview: {
        width: '100%',
        maxWidth: 400,
        height: 'auto',
        marginBottom: 16,
    },
    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    progressBarContainer: {
        flex: 1,
        marginLeft: 10,
    },
    docNameContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
        color: '#4B5563',
    },
    progressBackground: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
        marginBottom: 10,
        position: 'relative',
    },
    uploadStatusButton: {
        position: 'absolute',
        top: 10,
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        width: 113,
        alignItems: 'center',
        marginLeft: 35
    },
});
