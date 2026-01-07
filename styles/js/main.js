// styles\js\main.js
// styles/js/main.js

// --- Beginning of File ---

// Author: Tiran Ronelle Winston
// Created: 09/08/24
// Last Modified: 09/11/24
// Description: JavaScript file for handling client-side interactions in the Weight Loss Predictor web application.
// Version: 1.3.0
// License: Apache License 2.0

document.addEventListener('DOMContentLoaded', (event) => {
    const weightLossForm = document.getElementById('weightLossForm');
    const weeklyUpdateForm = document.getElementById('weeklyUpdateForm');
    const generateTestReportButton = document.querySelector('a[href="/test"]');
    const fillTestDataButton = document.querySelector('button[onclick="fillTestData()"]');
    const fillLastReportDataButton = document.querySelector('button[onclick="fillLastReportData()"]');

    if (weightLossForm) {
        weightLossForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this, '/');
        });
    } else {
        console.warn('Weight loss form not found');
    }

    if (weeklyUpdateForm) {
        weeklyUpdateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this, '/update_weekly');
        });
    } else {
        console.warn('Weekly update form not found');
    }

    if (generateTestReportButton) {
        generateTestReportButton.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('/test')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    window.location.href = '/results';
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An unexpected error occurred while generating the test report. Please try again.');
                });
        });
    } else {
        console.warn('Generate Test Report button not found');
    }

    if (fillTestDataButton) {
        fillTestDataButton.removeAttribute('onclick');
        fillTestDataButton.addEventListener('click', fillTestData);
    } else {
        console.warn('"Fill with Test Data" button not found');
    }

    if (fillLastReportDataButton) {
        fillLastReportDataButton.removeAttribute('onclick');
        fillLastReportDataButton.addEventListener('click', fillLastReportData);
    } else {
        console.warn('"Fill with Last Report Data" button not found');
    }
});

function handleFormSubmit(formElement, url) {
    fetch(url, {
        method: 'POST',
        body: new FormData(formElement)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.text();
    })
    .then(data => {
        window.location.href = '/results';
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An unexpected error occurred. Please try again.');
    });
}

function fillTestData() {
    fetch('/get_test_data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => fillForm(data))
        .catch(error => {
            console.error('Error fetching test data:', error);
            alert('Failed to fetch test data. Please try again.');
        });
}


function fillLastReportData() {
    document.getElementById('loading-spinner').style.display = 'block';
    fetch('/get_last_report_data')
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Unknown error');
                });
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('loading-spinner').style.display = 'none';
            if (data.error) {
                alert(data.error);
                return;
            }
            // Populate form fields with data
            document.getElementById('name').value = data.name || '';
            document.getElementById('current_weight').value = data.current_weight || '';
            document.getElementById('current_bf').value = data.current_bf || '';
            document.getElementById('goal_weight').value = data.goal_weight || '';
            document.getElementById('goal_bf').value = data.goal_bf || '';
            document.getElementById('start_date').value = data.start_date || '';
            document.getElementById('end_date').value = data.end_date || '';
            document.getElementById('dob').value = data.dob || '';
            document.getElementById('gender').value = data.gender || 'm';
            document.getElementById('height_feet').value = data.height_feet || '';
            document.getElementById('height_inches').value = data.height_inches || '';
            document.getElementById('protein_intake').value = data.protein_intake || '';
            document.getElementById('activity_level').value = data.activity_level || '1';
            document.getElementById('resistance_training').checked = data.resistance_training || false;
            document.getElementById('is_athlete').checked = data.is_athlete || false;
            document.getElementById('workout_type').value = data.workout_type || 'Bodybuilding';
            document.getElementById('workout_days').value = data.workout_days || '0';
            document.getElementById('job_activity').value = data.job_activity || 'sedentary';
            document.getElementById('leisure_activity').value = data.leisure_activity || 'sedentary';
            document.getElementById('experience_level').value = data.experience_level || 'Beginner (0-1 year)';
            alert("Form filled with last report data.");
        })
        .catch(error => {
            document.getElementById('loading-spinner').style.display = 'none';
            console.error('Error fetching last report data:', error);
            alert("Failed to fetch last report data. Please try again.");
        });
}


function fillForm(data) {
    for (const [key, value] of Object.entries(data)) {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value === 'y' || value === true;
            } else if (element.tagName === 'SELECT') {
                const option = Array.from(element.options).find(option => option.value === value.toString());
                if (option) {
                    option.selected = true;
                } else {
                    console.warn(`No matching option found for ${key} with value ${value}`);
                }
            } else {
                element.value = value;
            }
            console.log(`Set ${key} to ${value}`);
        } else {
            console.warn(`Element not found for key: ${key}`);
        }
    }

    // Also fill the weekly update form
    const weeklyWeight = document.getElementById('weekly_weight');
    const weeklyBf = document.getElementById('weekly_bf');
    if (weeklyWeight) weeklyWeight.value = data.current_weight || '';
    if (weeklyBf) weeklyBf.value = data.current_bf || '';
    console.log('Form filling complete');
}

// --- Footer ---
// Status: Development
// Contact: mambamental3mil@gmail.com
// © 2024 Mamba Matrix Solutions LLC. All rights reserved.
// --- End of File ---