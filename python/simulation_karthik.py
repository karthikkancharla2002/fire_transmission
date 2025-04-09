import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import os
from scipy import stats

# CHANGES:

# change number of units to take as input
# introduce 5 unit types - number of units take input of each type no of units
# take input of number of weather events, for each of the event, take prob of weather event to occur
# month modifier = 0.01 power 1/num of units in segment


def simulate_scenario():
    """
    Simulate one scenario for three segments over 9 months (July to March)
    Returns a dictionary with detailed simulation results. 
    """
    months = np.arange(1, 10)  # m = 1 to 9 (1: July, ..., 9: March)
    W = 5  # number of weather types

    # For segments 1 and 2, sample number of units (same for both) from U(20,30)
    n12 = np.random.randint(20, 31) # change to take as input
    # For segment 3, sample independently from U(20,30)
    n3 = np.random.randint(20, 31)
    n_units = [n12, n12, n3] # number of units for all segments

    # -------------------------
    # 1. Weather types and event generation
    # -------------------------
    # For segments 1 & 2, weather types are identical per month.
    weather12 = np.random.randint(1, W + 1, size=9)
    # For segment 3, weather types are independent.
    weather3 = np.random.randint(1, W + 1, size=9)

    # Generate number of weather events for each month based on weather type.
    # We use a Poisson distribution with lambda increasing with weather type.
    N12 = np.random.poisson(lam=weather12, size=9)  # events for segments 1 & 2
    N3 = np.random.poisson(lam=weather3, size=9)      # events for segment 3

    # -------------------------
    # 2. Set gamma for each month based on weather type. Gamma represents the probability that if a unit fails, that failure will lead to a bad outcome.
    # Gamma is set roughly as 0.3 + 0.1*(w-1) with some noise also making sure it is between 0 and 1.
    # -------------------------
    gamma12 = np.clip(0.3 + 0.1 * (weather12 - 1) + np.random.normal(0, 0.05, size=9), 0, 1)
    gamma3  = np.clip(0.3 + 0.1 * (weather3 - 1) + np.random.normal(0, 0.05, size=9), 0, 1)

    # -------------------------
    # 3. Rain event: randomly choose a month (October to March; m=4 to m=9)
    # and adjust the number of events.
    # -------------------------
    mrain = np.random.randint(4, 10)  # rain event month

    def revise_N(N_array):
        revised = np.empty_like(N_array)
        for m_idx, m in enumerate(months):
            if m < mrain: # Before the rain event the number of events remains unchanged.
                revised[m_idx] = N_array[m_idx]
            elif m == mrain: # During the rain event month number of events is reduced to a fraction
                eta = np.random.uniform(0, 1)
                revised[m_idx] = int(np.floor(eta * N_array[m_idx]))
            else: # after the rain event, no further weather events are assumed to occur.
                revised[m_idx] = 0
        return revised

    N12_orig = N12
    N3_orig = N3
    N12 = revise_N(N12)
    N3  = revise_N(N3)

    # -------------------------
    # 4. Set unit failure probabilities (pmij) for each segment and month.
    # For segments 1 and 3, draw pm uniformly from an interval that scales with weather intensity.
    # For segment 2, use the pm from segment 1 with added white noise.
    # m -> month, i -> unit, j -> segment
    # -------------------------
    def generate_pm(n_units, weather):
        # Empty matrix with shape (n_units, 9) for each month.
        pm = np.empty((n_units, 9))
        for m_idx, w in enumerate(weather):
            low = 1e-5 * w
            high = 1e-4 * w
            pm[:, m_idx] = np.random.uniform(low, high, size=n_units)
        return pm

    p1 = generate_pm(n_units[0], weather12)
    p3 = generate_pm(n_units[2], weather3)
    
    # For segment 2, add small white noise to segment 1's probabilities.
    sigma = 1e-6  # small variance for white noise
    epsilon = np.random.normal(0, sigma, size=(n_units[1], 9))
    p2 = p1 + epsilon
    p2 = np.clip(p2, 0, 1)  # ensuring probabilities remain within [0, 1]

    # -------------------------
    # 5. Computing segment failure probability qj.
    # -------------------------
    def compute_q(p_matrix, N_vec):
        prod = 1.0
        for m_idx in range(9):
            prod *= np.prod((1 - p_matrix[:, m_idx]) ** N_vec[m_idx])
        return 1 - prod

    q1 = compute_q(p1, N12)
    q2 = compute_q(p2, N12)
    q3 = compute_q(p3, N3)

    # -------------------------
    # 6. Compute rho j: probability that a segment fails and a bad outcome occurs in segment j.
    # -------------------------
    def compute_rho(p_matrix, N_vec, gamma_vec):
        prod = 1.0
        for m_idx in range(9):
            prod_i = np.prod((1 - p_matrix[:, m_idx]) ** N_vec[m_idx])
            term = prod_i + (1 - prod_i) * (1 - gamma_vec[m_idx])
            prod *= term
        return 1 - prod

    rho1 = compute_rho(p1, N12, gamma12)
    rho2 = compute_rho(p2, N12, gamma12)
    rho3 = compute_rho(p3, N3, gamma3)

    # -------------------------
    # 7. Adding everthing to a csv
    # -------------------------
    result = {
        "num_units_seg1_seg2": n12,
        "num_units_seg3": n3,
        "weather12 (Weather Type each month Seg1/2)": ",".join(map(str, weather12.tolist())),
        "weather3 (Weather type each month Seg3)": ",".join(map(str, weather3.tolist())),
        "N12 original (Weather Events Seg1/2)": ",".join(map(str, N12_orig.tolist())),
        "N12 after rain (Weather Events after rain Seg1/2)": ",".join(map(str, N12.tolist())),
        "N3 original (Weather Events Seg3)": ",".join(map(str, N3_orig.tolist())),
        "N3 after rain (Weather Events after rain Seg3)": ",".join(map(str, N3.tolist())),
        "mrain (Rain_Month)": mrain,
        "gamma12 (Bad outcome if unit fails)": ",".join(f"{val:.5f}" for val in gamma12.tolist()),
        "gamma3 (Bad outcome if unit fails)": ",".join(f"{val:.5f}" for val in gamma3.tolist()),
        "q1 (Segment1 failure prob)": q1,
        "q2 (Segment2 failure prob)": q2,
        "q3 (Segment3 failure prob)": q3,
        "rho1 (Prob of unit fail and bad outcome occurs segment 1)": rho1,
        "rho2 (Prob of unit fail and bad outcome occurs segment 2)": rho2,
        "rho3 (Prob of unit fail and bad outcome occurs segment 3)": rho3,
    }
    return result

def run_simulation(R=10000):
    """
    Run the simulation for R scenarios.
    """
    results_list = []
    for _ in range(R):
        results_list.append(simulate_scenario())
    return results_list

def save_results_to_csv(results_list, filename="simulation_results.csv"):
    """
    Save the simulation results to a CSV file.
    """
    df = pd.DataFrame(results_list)
    
    # If the file doesn't exist, write with header (including descriptions).
    if not os.path.exists(filename):
        df.to_csv(filename, mode='w', header=True, index=False)
    else:
        df.to_csv(filename, mode='a', header=False, index=False)
    print(f"Results saved to {filename}")

def plot_results(aggregated_data):
    """
    Plot histograms and perform analysis on aggregated data.
    """
    # Mapping of segment names to the corresponding DataFrame columns.
    segments = {
        "Segment 1": {
            "q": "q1 (Segment1 failure prob)",
            "rho": "rho1 (Prob of unit fail and bad outcome occurs segment 1)"
        },
        "Segment 2": {
            "q": "q2 (Segment2 failure prob)",
            "rho": "rho2 (Prob of unit fail and bad outcome occurs segment 2)"
        },
        "Segment 3": {
            "q": "q3 (Segment3 failure prob)",
            "rho": "rho3 (Prob of unit fail and bad outcome occurs segment 3)"
        }
    }
    
    for seg, cols in segments.items():
        plt.figure()
        plt.hist(aggregated_data[cols["q"]], bins=50, alpha=0.5, label=f'{seg} q')
        plt.hist(aggregated_data[cols["rho"]], bins=50, alpha=0.5, label=f'{seg} ρ')
        plt.legend()
        plt.title(f'{seg} Failure Probabilities')
        plt.xlabel('Probability')
        plt.ylabel('Frequency')
        
        # Save the plot as a PNG file.
        filename = f"{seg.replace(' ', '_')}_Failure_Probabilities.png"
        plt.savefig(filename)
        plt.close()
        print(f"Saved plot for {seg} as {filename}.")
        

if __name__ == '__main__':
    # Set the number of simulation scenarios per run.
    R = 10000
    results_list = run_simulation(R)
    
    # Save the current simulation results to a CSV file.
    save_results_to_csv(results_list, filename="simulation_results.csv")
    
    # Read data from the CSV file.
    data = pd.read_csv("simulation_results.csv")
    print(f"Aggregated data contains {len(data)} rows.")
    
    # Plot histograms and perform analysis on the aggregated data.
    plot_results(data)
