import random
from scipy import stats

"""
TODO:
    Add 5 unit types
    J - enumerates for number of units how many types + count
    Weather events - probabilities per type.
    Month modifier = 0.01 ** (1 / number of units in the segment)
"""

def simulation(
    J: int,                 # Number of segments
    n_j: int,               # Number of units in segment j
    m_rain: int,            # Randomly chosen month b/w Oct and March
    W: int,                 # Number of weather types

    N_j_m: list[int],       # Number of weather events at month m in segment j
    p_m_ij: list[float],    # Failure probability of unit i of the segment j at month m if an event occurs
    gamma_j_m: list[float], # The probability that a bad outcome occurs if unit j fails at month m

) -> float:
    """
    To be calculated during simulation
    """

    q_j: float              # Failure probability for segment j
    p_j: float              # Probability that unit j fails and a bad outcome occurs

    j_all = [1, 2, 3]
    m_all = [7, 8, 9, 10, 11, 12, 1, 2, 3]

    """
    Equation 2
    """
    q_j_comp = 1
    
    for m in range(len(m_all)):
        N_j_m_iter = N_j_m.copy()
        N_j_m_iter[m] = __set_njm_val(m_all[m], m_rain, N_j_m_iter[m])

        temp = 1
        for j in range(n_j):
            temp *= (1 - p_m_ij[m]) ** N_j_m_iter[m]
        
        q_j_comp *= temp
    
    q_j = 1 - q_j_comp

    """
    Equation 3
    """
    p_j_comp = 1
    for m in range(len(m_all)):
        N_j_m_iter = N_j_m.copy()
        N_j_m_iter[m] = __set_njm_val(m_all[m], m_rain, N_j_m_iter[m])

        left = 1
        for i in range(n_j):
            left *= (1 - p_m_ij[m]) ** N_j_m_iter[m]

        loop = 1
        for j in range(n_j):
            loop *= (1 - p_m_ij[m]) ** N_j_m_iter[m]

        right = (1 - loop) * (1 - gamma_j_m[m])

        p_j_comp *= (left + right) 

    p_j = 1 - p_j_comp


    return (q_j, p_j)

def __set_njm_val(m: int, m_rain: int, N_j_m: int) -> float | int:
    """
    Equation 1
    """
    if m == m_rain:
        nu = random.uniform(0, 1)
        N_j_m = abs(N_j_m * nu)
    elif m > m_rain:
        N_j_m = 0

    return N_j_m

    
if __name__ == "__main__":
    q, p = [], []

    R = 1000000

    for _ in range(R):
        q_j, p_j = simulation(
            J=3,
            n_j=random.randint(20, 30),
            m_rain=random.choice([10, 11, 12, 1, 2, 3]),
            W=5,
            N_j_m=[random.randint(0, 10) for _ in range(12)],
            p_m_ij=[round(random.random(), 2) for _ in range(12)],
            gamma_j_m=[round(random.random(), 2) for _ in range(12)]
        )

        q.append(round(q_j, 2))
        p.append(round(p_j, 2))

    q_stat, q_p_val = stats.shapiro(q)
    p_stat, p_p_val = stats.shapiro(p)
    print(f"\n Shapiro-Wilk statistic for q: {q_stat}, p-value: {q_p_val} \n Shapiro-Wilk statistic for p: {p_stat}, p-value: {p_p_val}")
